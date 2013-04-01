/**
 * @fileoverview Determining job states and saving to the right queue.
 *
 */

var _     = require('underscore'),
    when  = require('when');

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
  RETRYING: 'retrying',
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
    case: states.NEW:

    break;

    default:
      def.reject(new kError.InvalidState(this.job));
    break;
  }

  return def.promise;
};
