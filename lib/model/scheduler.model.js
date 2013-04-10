/**
 * @fileoverview Performs the scheduler operations, taking care of scheduled jobs.
 *
 */

// var _ = require('underscore');
var when = require('when');
var util = require('util');

var Model = require('./model');
var kconfig = require('../utility/config');
var JobModel = require('./job.model');
var JobItem = require('./job.item.js');
// var kError = require('../utility/kerror');
// var states = require('./states');

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
};
util.inherits(Scheduler, Model);

/**
 * Kickoff the scheduler
 *
 */
Scheduler.prototype.run = function() {
  this._ping();
};

Scheduler.prototype._ping = function() {
  this.queues.forEach(function(queue){
    var key = this.NS + ':' + queue;
    this._zpop(key).then(
      this._onZpopResponse.bind(this, queue),
      this._handleErrors.bind(this, queue)
    );

  }, this);

};

/**
 * Atomic ZPOP implementation for scheduled jobs.
 *
 * @param {string} key The scheduled queue.
 * @return {when.Promise} a promise.
 * @private
 */
Scheduler.prototype._zpop = function(key){
  var def = when.defer();
  var now = Date.now();
  var lookBehind = now - this.lookAhead;
  var lookAhead = now + this.lookAhead;

  this.client
    .multi()
    .zrangebyscore(key, lookBehind, lookAhead)
    .zremrangebyscore(key, lookBehind, lookAhead)
    .exec(function(err, res){
      if (err) {
        return def.reject(err);
      }
      var ids = res[0];
      def.resolve(ids);
    });

  return def.promise;
};

/**
 * Handle zpop's successful response.
 *
 * @param {string} queue The queue.
 * @param {Array.<string>} jobIds The job ids.
 */
Scheduler.prototype._onZpopResponse = function(queue, jobIds) {

  if (0 === jobIds.length) {
    return;
  }

  // fetch the job items for all job ids fetched.
  var jobModel;
  jobIds.forEach(function(jobId){
    jobModel = new JobModel(jobId);
    jobModel.fetch().then(this._lineupForQueue.bind(this, queue));
  }, this);

};


/**
 *
 * @param {string} queue The queue.
 * @param {Kickq.JobItem} jobItem the job item instance.
 */
Scheduler.prototype._lineupForQueue = function(queue, jobItem) {

  // defense
  if ( !(jobItem instanceof JobItem)) {
    return;
  }


};

/**
 *
 * @param {string} queue The queue.
 * @param {string} jobId The job id.
 */
Scheduler.prototype._addToProcessQueue = function(queue, jobId) {

};

/**
 * Handle errors produced by the scheduler.
 *
 * @param  {string} queue The queue that yielded the error.
 * @param  {string} err the error message
 * @private
 */
Scheduler.prototype._handleErrors = function(queue, err) {
  this._logError('Sceduler:' + queue, + ':' + err);
};
