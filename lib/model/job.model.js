/**
 * @fileoverview The job read/write/update operations using redis.
 *
 */

var when  = require('when');
var util = require('util');
var sequence = require('when/sequence');

var kconfig = require('../utility/config');
var Queue = require('./queue.model');
var Model = require('./model');
var kRedis = require('../utility/kredis');
var kError = require('../utility/kerror');

/**
 * The job Class.
 *
 * @param {Kickq.JobItem} jobItem the job item.
 * @constructor
 */
var JobModel = module.exports = function( jobItem ) {

  Model.apply(this, arguments);

  /** @type {redis.CreateClient} redis client */
  this.client = kRedis.client();

  /** @type {Kickq.JobItem} */
  this.job = jobItem;

  /** @type {string} The base namespace to use for storing to redis */
  this.NS = kconfig.get('redisNamespace');
};
util.inherits(JobModel, Model);

/**
 * Create or Update a job item, checks if new and gets an id or passes
 * control to the _update() method.
 *
 * @return {when.Promise} a promise.
 */
JobModel.prototype.save = function() {
  var def = when.defer();

  this.client.incr( this.NS + ':id', function(err, id) {
    if (err) return def.reject( new kError.Database(err) );

    this.job.id = id;

    // execute in sequence and resolve or reject the local deferred.
    sequence([
      this._update.bind(this),
      this._saveQueue.bind(this)
    ]).then(def.resolve, def.reject);

  }.bind(this));

  return def.promise;
};

/**
 * Create or Update a job item.
 *
 * @return {when.Promise} A promise.
 * @private
 */
JobModel.prototype._update = function() {
  var def = when.defer();

  var key = this.NS + ':job:' + this.job.id;

  this.job.updateTime.updateTime = Date.now();

  var itemDataJson;
  try {
    itemDataJson = JSON.stringify(this.job);
  } catch(ex) {
    return def.reject(new kError.JSON(ex));
  }

  var redisJobItem = {
    id: this.job.id,
    name: this.job.name,
    createTime: this.job.createTime,
    updateTime: this.job.updateTime,
    state: this.job.state,
    itemData: itemDataJson
  };

  this.client.hmset( key, redisJobItem, function(err) {
    if (err) {
      return def.reject(new kError.Database(err));
    }
    def.resolve();
  });

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
  return new Queue(this.job).save();
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

  // prep job item for save
  this.job.updateTime = Date.now();

  // deal with success first, its easier / most common
  if (success) {
    this._finishJob(true);
  } else {
    if (optTimeout) {
      this._processedTimeout();
    } else {
      this._processedError();
    }
  }


  var finalPromise = sequence([
    this._update.bind(this),
    this._saveQueue.bind(this)
  ]);

  var def = when.defer();
  // resolve or reject
  finalPromise.then(def.resolve, def.reject);

  // log error
  finalPromise.otherwise(
    this._logError.bind(this, 'Kickq.JobModel.processed')
  );

  return def.promise;

};


/**
 * A processed job's outcome was an Error, handle it.
 *
 * @return {when.Promise} A promise.
 * @private
 */
JobModel.prototype._processedError = function() {

  if (!this.job.retry) {
    this._finishJob(false);
  }

  if (this.job.runs.length < this.job.retryTimes) {
    // retry
    this.job.state = Queue.states.RETRY;
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
    if ( Queue.processStates.GHOST === processItem.state) {
      ghostCount++;
    }
  });

  if (ghostCount < this.job.ghostTimes) {
    this.job.state = Queue.states.GHOST;
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
  var state = (outcome ? Queue.states.SUCCESS : Queue.states.ERROR);

  this.job.state = state;
  this.job.finishTime = Date.now();
  // calculate total processing time
  var totalProcessTime = 0;
  this.job.runs.forEach(function(processItem){
    totalProcessTime += processItem.processTime;
  });
  this.job.totalProcessTime = totalProcessTime;
};
