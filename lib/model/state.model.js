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
}

/**
 * Add the job to the right queue, optionally emitting a publish redis event.
 *
 * @return {when.Promise} A promise.
 */
StateModel.prototype.save = function() {
  var def = when.Defer();

  switch(this.job.state) {
    case: StateModel.states.NEW:
      sequence([
        this.addToProcessQueue.bind(this),
        this.checkHotJob.bind(this)
      ]).then(def.resolve, def.reject);
    break;
    case: StateModel.states.DELAYED:
      // schedule
      //
    break;
    case: StateModel.states.PROCESSING:
      // nothing todo here
      def.resolve();
    break;
    case: StateModel.states.RETRY:
      // schedule
    break;
    case: StateModel.states.GHOST:
      // schedule
    break;
    case: StateModel.states.SUCCESS:
      // nuke schedule
      //
    break;
    case: StateModel.states.FAIL:
      // nuke schedule
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

};

/**
 * Check if the job has the hotjob flag on and handle it.
 *
 * @return {when.Promise} A promise.
 */
StateModel.prototype.checkHotJob = function() {

};
