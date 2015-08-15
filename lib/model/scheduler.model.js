/**
 * @fileoverview Performs the scheduler operations, taking care of scheduled jobs.
 *
 */
var _ = require('underscore');
var Promise = require('bluebird');
var log = require('logg').getLogger('kickq.model.Scheduler');

var Model = require('./model');
var kconfig = require('../utility/config');
var JobModel = require('./job.model');
var JobItem = require('./job.item.js');
// var kError = require('../utility/kerror');
var states = require('./states');
var Queue = require('./queue.model');

/**
 * The Scheduler class
 *
 * @constructor
 * @extends {Kickq.Model}
 */
var Scheduler = module.exports = Model.extend(function() {
  log.finer('Ctor() :: Init');

  this.intervalTime = kconfig.get('schedulerInterval');
  this.fuzz = kconfig.get('schedulerFuzz');
  this.lookAhead = kconfig.get('schedulerLookAhead');

  /** @type {Array} The queues that the scheduler will check */
  this.queues = [
    'scheduled',
    'scheduled-purge'
  ];

  /** @type {?Object} timeout index ref */
  this._pongTimeout = null;

  // listen for changes in config
  kconfig.on('schedulerInterval', this._onConfigChange.bind(this));
  kconfig.on('schedulerFuzz', this._onConfigChange.bind(this));
  kconfig.on('schedulerLookAhead', this._onConfigChange.bind(this));
});

/**
 * Triggers when config changes and updates internal values.
 *
 * @param {string} key The key that changed.
 * @param {*} value The new value.
 * @private
 */
Scheduler.prototype._onConfigChange = function(key, value) {
  switch(key) {
  case 'schedulerInterval':
    this.intervalTime = value;
    // check if a pong timeout is running and cancel it
    // and restart the loop asynchronously.
    if (_.isNull(this._pongTimeout)) {
      return;
    }
    clearTimeout(this._pongTimeout);
    this._pongTimeout = null;
    setTimeout(this._ping.bind(this), 50);
    break;
  case 'schedulerFuzz':
    this.fuzz = value;
    break;
  case 'schedulerLookAhead':
    this.lookAhead = value;
    break;
  }
};

/**
 * Kickoff the scheduler
 *
 */
Scheduler.prototype.run = function() {
  this._ping();
};

/**
 * Perform an atomic query on the db for all scheduled queues.
 *
 * @private
 */
Scheduler.prototype._ping = function() {
  log.finest('_ping() :: Perfoming atomic zpop on all scheduled queues.');
  clearTimeout(this._pongTimeout);
  this._pongTimeout = null;

  Promise.resolve(this.queues)
    .bind(this)
    .map(function(queue){
      var key = this.NS + ':' + queue;
      return this._zpop(key)
        .then(this._onZpopResponse.bind(this, queue))
        .catch(this._handleErrors.bind(this, queue));
    })
    .finally(this._pong);
};

/**
 * Polling sleep.
 *
 * @private
 */
Scheduler.prototype._pong = function() {
  // get a random integer in the range of 0 to this.fuzz
  var fuzz = Math.floor(Math.random() * (this.fuzz - 0 + 1)) + 0;

  var totalTimeout = this.intervalTime + fuzz;
  log.finest('_pong() :: Init. Next ping in: ', totalTimeout);
  this._pongTimeout = setTimeout(this._ping.bind(this), totalTimeout);
};

/**
 * Atomic ZPOP implementation for scheduled jobs.
 *
 * @param {string} key The scheduled queue.
 * @return {Promise} a promise.
 * @private
 */
Scheduler.prototype._zpop = Promise.method(function(key) {
  var now = Date.now();
  var lookBehind = now - this.lookAhead;
  var lookAhead = now + this.lookAhead;

  var self = this;
  return new Promise(function(resolve, reject) {
    self.client
      .multi()
      .zrangebyscore(key, lookBehind, lookAhead)
      .zremrangebyscore(key, lookBehind, lookAhead)
      .exec(function(err, res){
        if (err) {
          log.db('_zpop() :: exec() Error: ', err);
          reject(err);
          return;
        }
        var ids = res[0];
        resolve(ids);
      });
  })
  .catch(function(err) {
    log.error('_zpop() :: Execution Error: ', err);
    throw err;
  });
});

/**
 * Handle zpop's successful response.
 *
 * @param {string} queue The queue.
 * @param {Array.<string>} jobIds The job ids.
 * @return {Promise} A promise, always resolves.
 */
Scheduler.prototype._onZpopResponse = Promise.method(function(queue, jobIds) {
  if (jobIds.length === 0) {
    return;
  }

  log.fine('_onZpopResponse() :: Init. queue:', queue, 'jobIds:', jobIds);

  // fetch the job items for all job ids fetched.
  return Promise.resolve(jobIds)
    .bind(this)
    .map(function(jobId){
      var jobModel = new JobModel(jobId);
      return jobModel.fetch();
    })
    .map(this._lineupForQueue.bind(this, queue))
    .catch(function(err) {
      log.db('_onZpopResponse() :: Job Fetching failed! err: ', err);
    });
});


/**
 * Check the scheduled time of execution for the provided job item and
 * schedule with a native JS setTimeout when actual addition to the process
 * queue will happen.
 *
 * @param {string} queue The queue.
 * @param {Kickq.JobItem} jobItem the job item instance.
 * @return {Promise} a promise, always resolves.
 */
Scheduler.prototype._lineupForQueue = Promise.method(function(queue, jobItem) {
  log.finest('_lineupForQueue() :: Init. queue:', queue, 'jobId:', jobItem.id);

  // defense
  if ( !(jobItem instanceof JobItem)) {
    return;
  }

  var timediff = jobItem.scheduledFor - Date.now();

  // sanitize timediff
  if (
    // number check
    !_.isNumber(timediff) ||
    // extreme number check
    (this.lookAhead * 2) < timediff) {

    // if not valid, reset to the lookahead value.
    timediff = this.lookAhead;
  }

  // negative check
  if (0 > timediff) {
    timediff = 0;
  }

  // decide on action for job item
  var action;
  switch(queue) {
  case 'scheduled':
    action = this._addToProcessQueue.bind(this, jobItem);
    break;
  case 'scheduled-purge':
    action = this._purgeJob.bind(this, jobItem);
    break;
  }

  // queue on ram
  setTimeout(action, timediff);
});

/**
 * Adds the job item to the processing queue.
 *
 * @param {Kickq.JobItem} jobItem the job item instance.
 * @private
 */
Scheduler.prototype._addToProcessQueue = function(jobItem) {
  log.finest('_addToProcessQueue() :: Init. jobId: ', jobItem.id);
  jobItem.setState(states.Job.QUEUED).then(function(){
    // add the item to the proper queue (processing most likely)
    var queue = new Queue(jobItem);
    queue.save();
  });
};

/**
 * Purge the job item.
 *
 * @param  {Kickq.JobItem} jobItem the item to purge.
 * @private
 */
Scheduler.prototype._purgeJob = function(jobItem) {
  log.finest('_purgeJob() :: Init. jobId: ', jobItem.id);

  if (!kconfig.get('purgeJobs')) {
    return;
  }

  jobItem.delete();
};

/**
 * Handle errors produced by the scheduler.
 *
 * @param  {string} queue The queue that yielded the error.
 * @param  {string} err the error message
 * @private
 */
Scheduler.prototype._handleErrors = function(queue, err) {
  log.error('_handleErrors() :: Queue: ', queue, 'Error:', err);
};


Scheduler.prototype.dispose = function() {
  kconfig.removeListener('schedulerInterval', this._onConfigChange.bind(this));
  kconfig.removeListener('schedulerFuzz', this._onConfigChange.bind(this));
  kconfig.removeListener('schedulerLookAhead', this._onConfigChange.bind(this));
};
