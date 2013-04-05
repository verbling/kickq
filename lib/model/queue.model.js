/**
 * @fileoverview Handles proper queueing of the jobs,
 *   publishing events to redis channels.
 *
 */

var _ = require('underscore');
var when = require('when');
var util = require('util');
var sequence = require('when/sequence');

var Model = require('./model');
var kconfig = require('../utility/config');
var Hotjob = require('./hotjob.model');
var kError = require('../utility/kerror');

/**
 * The State Class.
 *
 * @param {Kickq.JobItem} jobItem the job item.
 * @constructor
 */
var QueueModel = module.exports = function( jobItem ) {

  Model.apply(this, arguments);

  /** @type {Kickq.JobItem} */
  this.job = jobItem;

};
util.inherits(QueueModel, Model);

/**
 * The states.
 *
 * @enum {string}
 */
QueueModel.states = {
  NEW: 'new',
  DELAYED: 'delayed',
  PROCESSING: 'processing',
  RETRY: 'retry',
  GHOST: 'ghost',
  SUCCESS: 'success',
  FAIL: 'fail'
};

/**
 * The process item states, a subset of states.
 *
 * @enum {string}
 */
QueueModel.processStates = {
  PROCESSING: QueueModel.states.PROCESSING,
  GHOST: QueueModel.states.GHOST,
  SUCCESS: QueueModel.states.SUCCESS,
  FAIL: QueueModel.states.FAIL
};

/**
 * Add the job to the right queue, optionally emitting a publish redis event.
 *
 * @return {when.Promise} A promise.
 */
QueueModel.prototype.save = function() {
  var def = when.Defer();

  switch(this.job.state) {
    case QueueModel.states.NEW:
      sequence([

        // new jobs get added to process queue and check for hotjob option.
        this.addToProcessQueue.bind(this),
        this.checkHotjob.bind(this)

      ]).then(def.resolve, def.reject);
    break;
    case QueueModel.states.PROCESSING:
      // nothing todo here
      def.resolve();
    break;
    case QueueModel.states.DELAYED:
    case QueueModel.states.RETRY:
    case QueueModel.states.GHOST:
      // schedule
      when( this.schedule().bind(this) ).then(def.resolve, def.reject);
    break;
    case QueueModel.states.SUCCESS:

      // emit complete event
      var publishKey = this.NS + ':complete:' + this.job.name;
      var jobSerialized = this.job.getPublicJSON();
      this.client.publish( publishKey, jobSerialized );

      // BREAK OMITTED ON PURPOSE
    case QueueModel.states.FAIL:

      // nuke schedule
      when( this.purgeSchedule().bind(this) ).then(def.resolve, def.reject);
    break;

    default:
      def.reject(new kError.InvalidState(this.job));
    break;
  }

  return def.promise;
};

/**
 * Add the job to the process queue, emit a publish event on redis.
 *
 * @return {when.Promise} A promise.
 */
QueueModel.prototype.addToProcessQueue = function() {
  var def = when.defer();

  // kickq:queue:[ job name ]
  var queueKey = this.NS + ':queue:' + this.job.name;

  this.client.rpush( queueKey, function(err) {
    if (err) {
      return def.reject(new kError.QueueFail(this.job));
    }

    // shout out to my big b and iron ziz!
    this.client.publish( queueKey, this.job.id );

    return def.resolve();
  }.bind(this));

  return def.promise;
};

/**
 * Check if the job has the hotjob flag on and handle it.
 *
 * @return {when.Promise} A promise.
 */
QueueModel.prototype.checkHotjob = function() {
  return new Hotjob(this.job).check();
};

/**
 * Schedule the job.
 *
 * @return {when.Promise} A promise.
 */
QueueModel.prototype.schedule = function() {

  // figure out when this job should move to the process queue
  var delay;
  switch(this.job.state) {
    case QueueModel.states.DELAYED:
      delay = this.job.delay * 1000;
    break;
    case QueueModel.states.RETRY:
      delay = this.job.retryInterval * 1000;
    break;
    case QueueModel.states.GHOST:
      delay = kconfig.get('ghostInterval') * 1000;
    break;
  }

  return this._scheduleRedis('scheduled', delay);
};

/**
 * Schedule the job to get purged.
 *
 * @return {when.Promise} A promise.
 */
QueueModel.prototype.purgeSchedule = function() {
  var delay = kconfig.get('purgeTimeout') * 1000;

  return this._scheduleRedis('scheduled-purge', delay);
};



/**
 * Create the actual scheduling record in redis.
 *
 * @param {string} queue The queue, one of 'scheduled', 'scheduled-purge'.
 * @param {number} delay delay in miliseconds.
 * @return {when.Promise} A promise.
 * @private
 */
QueueModel.prototype._scheduleRedis = function(queue, delay) {
  var def = when.defer();

  // save any bloopers with a 5' scheduling
  if (!_.isNumber(delay)) {
    delay = 300000;
  }
  var scheduleFor = Date.now() + delay;

  this.client.zset(this.NS + ':' + queue, scheduleFor, this.job.id, function(err) {
    if (err) {
      return def.reject(new kError.Database(err));
    }
    def.resolve();
  }.bind(this));

  return def.promise;
};


