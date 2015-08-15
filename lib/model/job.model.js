/**
 * @fileoverview The job read/write/update operations using redis.
 *
 */
var _ = require('underscore');
var Promise  = require('bluebird');

var log = require('logg').getLogger('kickq.model.JobModel');

var Queue = require('./queue.model');
var JobItem = require('../model/job.item');
var Model = require('./model');
var kError = require('../utility/kerror');
var states = require('./states');

/**
 * The job Class.
 *
 * @param {Kickq.JobItem|string} jobItem the job item or job id.
 * @constructor
 * @extends {Kickq.Model}
 */
var JobModel = module.exports = Model.extend(function(jobItem) {
  log.finer('Ctor() :: Init');

  /** @type {?Kickq.JobItem} */
  this.job = null;

  /** @type {?string} The jobId */
  this.jobId = null;

  /** @type {boolean} if a valid job item is loaded */
  this.hasJobItem = false;

  if (_.isString(jobItem) && jobItem.length) {
    // it's an id
    this.jobId = jobItem;
  } else {
    if ( !(jobItem instanceof JobItem) ){
      throw new TypeError('Argument not string or Kickq.JobItem');
    }
    this.job = jobItem;
    this.jobId = jobItem.id;
    this.hasJobItem = true;
  }
});

/**
 * Fetch the job if not loaded.
 *
 * @return {Promise} a promise.
 */
JobModel.prototype.fetch = Promise.method(function() {
  log.info('fetch() :: Init. jobId: ' + this.jobId);

  // defense
  if (this.hasJobItem) {
    throw new Error('Instance already contains a job item');
  }
  if (!_.isString(this.jobId)) {
    throw new Error('No job id has been defined');
  }

  var key = this.NS + ':job:' + this.jobId;

  var self = this;
  return new Promise(function(resolve, reject) {
    self.client.hmget(key, 'itemData', 'state',
      self._fetchResponse.bind(self, resolve, reject));
  });

});

/**
 * fetch response.
 *
 * @param {Function} resolve the promise resolve.
 * @param {Function} reject the promise reject.
 * @param {?string} err error message.
 * @param {string|null} response db response.
 * @private
 */
JobModel.prototype._fetchResponse = function(resolve, reject, err, response) {

  log.finer('_fetchResponse() :: Init. err:', err);

  if (err) {
    log.db('_fetchResponse() :: "hget" Failed! err: ', err);
    reject(new kError.Database(err));
    return;
  }

  var itemData = response[0];
  var state = response[1];

  if (!_.isString(itemData)) {
    reject(new kError.NoRecord(this.jobId));
    return;
  }

  var jobItem;
  try {
    jobItem = JSON.parse(itemData);
  } catch(ex) {
    reject(new kError.JSON(ex));
    return;
  }

  // record state trumps itemData
  jobItem.state = state;

  this.job = new JobItem(jobItem);

  // sanity check
  if (this.jobId !== this.job.id) {
    reject(new kError.NoRecord(this.jobId, 'Fetched jobId does not' +
      ' match fetched one: ' + this.job.id ));
    return;
  }

  this.hasJobItem = true;
  log.finest('_fetchResponse() :: Fetched ok. jobId: ', this.job.id);
  resolve(this.job);
};

/**
 * Create a new job item.
 *
 * @return {Promise} a promise.
 */
JobModel.prototype.create = Promise.method(function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.client.incr( self.NS + ':id', function(err, id) {
      if (err) {
        log.db('create() :: "incr" Failed! err: ', err);
        reject( new kError.Database(err) );
        return;
      }

      // cast to string
      self.job.id = id + '';

      // execute in sequence job-item save, state, time-index and queueing up.
      self.job.save()
        .then(self.job.createState.bind(self.job))
        .then(self.job.createTimeIndex.bind(self.job))
        .then(self._saveQueue.bind(self))
        .then(self._saveTimeIndex.bind(self))
        .then(resolve)
        .catch(reject);
    });
  });
});



/**
 * After a job has been saved to redis the state needs to be determined and
 * add the Job Id to the proper queue.
 *
 * @return {Promise} a promise.
 * @private
 */
JobModel.prototype._saveQueue = Promise.method(function() {
  var queue = new Queue(this.job);
  return queue.save();
});

/**
 * When a consumer finishes processing a job, flow ends up here,
 * this method will determine the next state of the job and perform
 * the required updates on redis.
 *
 * @param {boolean} success Process outcome.
 * @param {boolean=} optTimeout If processing timed out.
 * @return {Promise} a promise.
 */
JobModel.prototype.processed = Promise.method(function(success, optTimeout) {
  // processCount logger hack (set in worker.ctrl)
  var processCount = this.job._processCount;
  delete this.job._processCount;

  log.info('processed() :: Init. Jobid:', this.job.id, 'success:', success,
    'processCount:', processCount, 'optTimeout:', optTimeout, 'queue:', this.job.name);

  // store the old state of the job
  var state = this.job.state;

  // deal with success first, it's most common
  if (success) {
    this._finishJob(true);
  } else {
    if (optTimeout) {
      this._processedTimeout();
    } else {
      this._processedError();
    }
  }

  // get new and restore old state so setState() can run
  var newState = this.job.state;
  this.job.state = state;

  // save the state
  // save the job item
  // Add to proper queue
  return this.job.setState(newState)
    .bind(this.job)
    .then(this.job.save)
    .bind(this)
    .then(this._saveQueue)
    .catch(function(err) {
      log.error('processed() :: Failed for jobId, err, _processCount:',
        this.job.id, err, processCount);
      throw err;
    });
});


/**
 * A processed job's outcome was an Error, handle it.
 *
 * @private
 */
JobModel.prototype._processedError = function() {

  if (!this.job.retry) {
    this._finishJob(false);
    return;
  }
  if (this.job.runs.length < this.job.retryTimes) {
    // retry
    this.job.state = states.Job.RETRY;
  } else {
    // abort
    this._finishJob(false);
  }

};

/**
 * A processesing job has timed out, handle it.
 *
 * @private
 */
JobModel.prototype._processedTimeout = function() {

  if (!this.job.ghostRetry) {
    this._finishJob(false);
    return;
  }

  // get how many times this job has been ghosted before.
  var ghostCount = 0;
  this.job.runs.forEach(function(processItem){
    if ( states.Process.GHOST === processItem.state) {
      ghostCount++;
    }
  });

  log.info('_processedTimeout() :: ghostCount, ghostTimes: ',
    ghostCount, this.job.ghostTimes);

  if (ghostCount > this.job.ghostTimes) {
    this._finishJob(false);
  } else {
    this.job.state = states.Job.GHOST;
  }
};

/**
 * Perform finish updates on job item.
 * @param  {boolean} outcome The finish outcome.
 *
 * @private
 */
JobModel.prototype._finishJob = function(outcome) {
  this.job.complete = true;
  this.job.success = outcome;
  var state = (outcome ? states.Job.SUCCESS : states.Job.FAIL);

  this.job.state = state;
  this.job.finishTime = Date.now();
  // calculate total processing time
  var totalProcessTime = 0;
  this.job.runs.forEach(function(processItem){
    totalProcessTime += processItem.processTime;
  });
  this.job.totalProcessTime = totalProcessTime;
};

/**
 * Create a record in the time-index key.
 *
 * @return {Promise} A promise.
 */
JobModel.prototype._saveTimeIndex = Promise.method(function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.client.zadd( self.NS + ':time-index', self.job.createTime, self.job.id,
      function(err) {
      if (err) {
        log.db('_saveTimeIndex() :: "zadd" Failed! err: ', err);
        reject(new kError.Database(err));
        return;
      }
      resolve();
    });
  });
});
