/**
 * @fileoverview Performs the scheduler operations, taking care of scheduled jobs.
 *
 */

var _ = require('underscore');
var when = require('when');
var util = require('util');
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
var Scheduler = module.exports = function() {

  Model.apply(this, arguments);

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
};
util.inherits(Scheduler, Model);

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
  log.finest('_ping() :: Init');
  clearTimeout(this._pongTimeout);
  this._pongTimeout = null;

  var promises = [];
  this.queues.forEach(function(queue){
    var key = this.NS + ':' + queue;
    var promise = this._zpop(key).then(
      this._onZpopResponse.bind(this, queue),
      this._handleErrors.bind(this, queue)
    );
    promises.push(promise);
  }, this);

  //when.all(promises).always(this._pong.bind(this));
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
 * @return {when.Promise} a promise.
 * @private
 */
Scheduler.prototype._zpop = function(key) {
  var def = when.defer();
  var now = Date.now();
  var lookBehind = now - this.lookAhead;
  var lookAhead = now + this.lookAhead;

  try{
    this.client
      .multi()
      .zrangebyscore(key, lookBehind, lookAhead)
      .zremrangebyscore(key, lookBehind, lookAhead)
      .exec(function(err, res){
        if (err) {
          log.warn('_zpop() :: exec() Error: ', err);
          return def.reject(err);
        }
        var ids = res[0];
        def.resolve(ids);
      });
  } catch(ex) {
    log.error('_zpop() :: Exception Error: ', ex);
    def.reject();
  }
  return def.promise;
};

/**
 * Handle zpop's successful response.
 *
 * @param {string} queue The queue.
 * @param {Array.<string>} jobIds The job ids.
 * @return {when.Promise} a promise, always resolves.
 */
Scheduler.prototype._onZpopResponse = function(queue, jobIds) {
  if (0 === jobIds.length) {
    return when.resolve();
  }

  var promises = [];
  // fetch the job items for all job ids fetched.
  var jobModel;
  jobIds.forEach(function(jobId){
    jobModel = new JobModel(jobId);
    promises.push(
      jobModel.fetch().then(
        this._lineupForQueue.bind(this, queue),
        when.resolve)
    );
  }, this);
  var def = when.defer();

  when.all(promises).then(def.resolve, def.resolve);

  return def.promise;
};


/**
 * Check the scheduled time of execution for the provided job item and
 * schedule with a native JS setTimeout when actual addition to the process
 * queue will happen.
 *
 * @param {string} queue The queue.
 * @param {Kickq.JobItem} jobItem the job item instance.
 * @return {when.Promise} a promise, always resolves.
 */
Scheduler.prototype._lineupForQueue = function(queue, jobItem) {
  // defense
  if ( !(jobItem instanceof JobItem)) {
    return when.resolve();
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


  // queue on ram
  setTimeout(this._addToProcessQueue.bind(this, queue, jobItem), timediff);

  // sync fn
  return when.resolve();
};

/**
 * Adds the job item to the processing queue.
 *
 * @param {string} queue The queue.
 * @param {Kickq.JobItem} jobItem the job item instance.
 */
Scheduler.prototype._addToProcessQueue = function(queue, jobItem) {
  jobItem.setState(states.Job.QUEUED).then(function(){
    // add the item to the proper queue (processing most likely)
    var queue = new Queue(jobItem);
    queue.save();
  });
};

/**
 * Handle errors produced by the scheduler.
 *
 * @param  {string} queue The queue that yielded the error.
 * @param  {string} err the error message
 * @private
 * @return {when.Promise} a promise, always resolves.
 */
Scheduler.prototype._handleErrors = function(queue, err) {
  log.error('_handleErrors() :: Queue: ', queue, err);
  return when.resolve();
};


Scheduler.prototype.dispose = function() {
  kconfig.removeListener('schedulerInterval', this._onConfigChange.bind(this));
  kconfig.removeListener('schedulerFuzz', this._onConfigChange.bind(this));
  kconfig.removeListener('schedulerLookAhead', this._onConfigChange.bind(this));
};
