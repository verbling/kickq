/**
 * @fileoverview The job read/write/update operations using redis.
 *
 */
var util = require('util');
var _ = require('underscore');
var when  = require('when');

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
var JobModel = module.exports = function( jobItem ) {
  log.fine('ctor() :: Init');
  Model.apply(this, arguments);

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

};
util.inherits(JobModel, Model);

/**
 * Fetch the job if not loaded.
 *
 * @return {when.Promise} a promise.
 */
JobModel.prototype.fetch = function() {
  var def = when.defer();

  log.info('fetch() :: Init. jobId: ' + this.jobId);

  // defense
  if (this.hasJobItem) {
    throw new Error('Instance already contains a job item');
  }
  if (!_.isString(this.jobId)) {
    throw new Error('No job id has been defined');
  }

  var key = this.NS + ':job:' + this.jobId;

  this.client.hget(key, 'itemData',
    this._fetchResponse.bind(this, def.resolver));

  return def.promise;
};

/**
 * fetch response.
 *
 * @param {when.Resolver} resolver the promise resolver.
 * @param {?string} err error message.
 * @param {string|null} response db response.
 * @private
 */
JobModel.prototype._fetchResponse = function(resolver, err, response) {

  log.fine('_fetchResponse() :: Init. err:', err);

  if (err) {
    resolver.reject(new kError.Database(err));
    return;
  }

  if (!_.isString(response)) {
    resolver.reject(new kError.NoRecord(this.jobId));
    return;
  }

  var jobItem;
  try {
    jobItem = JSON.parse(response);
  } catch(ex) {
    resolver.reject(new kError.JSON(ex));
    return;
  }

  this.job = new JobItem(jobItem);

  // sanity check
  if (this.jobId !== this.job.id) {
    resolver.reject(new kError.InvalidData('local job id does not match'));
    return;
  }

  this.hasJobItem = true;
  log.finest('_fetchResponse() :: Fetched ok. jobId: ', this.job.id);
  resolver.resolve(this.job);
};

/**
 * Create a new job item.
 *
 * @return {when.Promise} a promise.
 */
JobModel.prototype.create = function() {
  var def = when.defer();

  this.client.incr( this.NS + ':id', function(err, id) {
    if (err) return def.reject( new kError.Database(err) );

    // cast to string
    this.job.id = id + '';

    // execute in sequence job-item save and queueing up.
    this.job.save()
      .then(this._saveQueue.bind(this), def.reject)
      .then(this._saveTimeIndex.bind(this), def.reject)
      .then(def.resolve, def.reject);

  }.bind(this));

  return def.promise;
};



/**
 * After a job has been saved to redis the state needs to be determined and
 * add the Job Id to the proper queue.
 *
 * @return {when.Promise} a promise.
 * @private
 */
JobModel.prototype._saveQueue = function() {
  var queue = new Queue(this.job);
  return queue.save();
};

/**
 * When a consumer finishes processing a job, flow ends up here,
 * this method will determine the next state of the job and perform
 * the required updates on redis.
 *
 * @param {boolean} success Process outcome.
 * @param {boolean=} optTimeout If processing timed out.
 * @return {when.Promise} a promise.
 */
JobModel.prototype.processed = function(success, optTimeout) {
  log.info('processed() :: Init. Jobid:', this.job.id, ' success: ', success);
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

  var def = when.defer();

  // save the state
  // save the job item
  // Add to proper queue
  var finalPromise = this.job.setState(newState)
    .then(this.job.save.bind(this.job), def.reject)
    .then(this._saveQueue.bind(this), def.reject);

  // resolve or reject
  finalPromise.then(def.resolve, def.reject);

  // log error
  finalPromise.otherwise(function(err) {
    log.error('processed() :: Failed for jobid:', this.job.id, err);
  });

  return def.promise;

};


/**
 * A processed job's outcome was an Error, handle it.
 *
 * @private
 */
JobModel.prototype._processedError = function() {

  if (!this.job.retry) {
    this._finishJob(false);
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

  if (ghostCount < this.job.ghostTimes) {
    this.job.state = states.Job.GHOST;
  } else {
    this._finishJob(false);
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
 * @return {when.Promise} A promise.
 */
JobModel.prototype._saveTimeIndex = function() {
  var def = when.defer();
  this.client.zadd( this.NS + ':time-index', this.job.createTime, this.job.id,
    function(err) {
    if (err) {
      return def.reject(new kError.Database(err));
    }
    def.resolve();
  });

  return def.promise;
};
