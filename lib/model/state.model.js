/**
 * @fileoverview Determining job states and saving to the right queue.
 *
 */

var _     = require('underscore'),
    when  = require('when'),
    sequence = require('when/sequence');

var kconfig   = require('../utility/config'),
    kRedis = require('../utility/kredis'),
    kError    = require('../utility/kerror');

/**
 * The State Class.
 *
 * @param {JobItem} jobItem the job item.
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
 * Add the job to the right queue, optionally emitting a publish redis event.
 *
 * @return {when.Promise} A promise.
 */
StateModel.prototype.save = function() {
  var def = when.Defer();

  switch(this.job.state) {
    case StateModel.states.NEW:
      sequence([
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
      when( this.nukeSchedule().bind(this) ).then(def.resolve, def.reject);
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

  var def = when.defer();

  if ( !this.job.hotjob || StateModel.states.NEW !== this.job.state) {
    return def.resolve();
  }



  // create a new connection to redis
  var client = kRedis.client();
  var subKey = this.NS + ':complete:' + this.job.name;
  var hotjobDef = when.defer();

  client.subscribe(subKey);

  return def.promise;
};

/**
 * Schedule the job.
 *
 * @return {when.Promise} A promise.
 */
StateModel.prototype.schedule = function() {
  var def = when.defer();

  return def.promise;
};

/**
 * Schedule the job to get purged.
 *
 * @return {when.Promise} A promise.
 */
StateModel.prototype.nukeSchedule = function() {
  var def = when.defer();

  return def.promise;
};
