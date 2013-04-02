/**
 * @fileoverview Determining job states and saving to the right queue.
 *
 */

var _     = require('underscore'),
    when  = require('when'),
    sequence = require('when/sequence');

var kconfig   = require('../utility/config'),
    kRedis = require('../utility/kredis'),
    Hotjob = require('../control/hotjob.ctrl'),
    kError    = require('../utility/kerror');

/**
 * The State Class.
 *
 * @param {Kickq.JobItem} jobItem the job item.
 * @constructor
 */
var StateModel = module.exports = function( jobItem ) {

  /** @type {redis.CreateClient} redis client */
  this.client = kRedis.client();

  /** @type {Kickq.JobItem} */
  this.job = jobItem;

  /** @type {string} The base namespace to use for storing to redis */
  this.NS = kconfig.get('redisNamespace');
};

/**
 * The states.
 *
 * @enum {string}
 */
StateModel.states = {
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
StateModel.processStates = {
  PROCESSING: StateModel.states.PROCESSING,
  GHOST: StateModel.states.GHOST,
  SUCCESS: StateModel.states.SUCCESS,
  FAIL: StateModel.states.FAIL
};

/**
 * Add the job to the right queue, optionally emitting a publish redis event.
 *
 * @return {when.Promise} A promise.
 */
StateModel.prototype.save = function() {
  var def = when.Defer();

  switch(this.job.state) {
    case StateModel.states.NEW:
      sequence([

        // new jobs get added to process queue and check for hotjob option.
        this.addToProcessQueue.bind(this),
        this.checkHotjob.bind(this)

      ]).then(def.resolve, def.reject);
    break;
    case StateModel.states.PROCESSING:
      // nothing todo here
      def.resolve();
    break;
    case StateModel.states.DELAYED:
    case StateModel.states.RETRY:
    case StateModel.states.GHOST:
      // schedule
      when( this.schedule().bind(this) ).then(def.resolve, def.reject);
    break;
    case StateModel.states.SUCCESS:
    case StateModel.states.FAIL:
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
StateModel.prototype.addToProcessQueue = function() {
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
StateModel.prototype.checkHotjob = function() {
  return new Hotjob(this.job).check();
};

/**
 * Schedule the job.
 *
 * @return {when.Promise} A promise.
 */
StateModel.prototype.schedule = function() {

  // figure out when this job should move to the process queue
  var delay;
  switch(this.job.state) {
    case StateModel.states.DELAYED:
      delay = this.job.delay * 1000;
    break;
    case StateModel.states.RETRY:
      delay = this.job.retryInterval * 1000;
    break;
    case StateModel.states.GHOST:
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
StateModel.prototype.purgeSchedule = function() {
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
StateModel.prototype._scheduleRedis = function(queue, delay) {
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
