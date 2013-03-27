/**
 * @fileoverview Create a new job.
 */

var _ = require('underscore');

var kconfig   = require('./kickq.config'),
    kickRedis = require('./kickRedis');

/**
 * Create a new job Class.
 *
 * @param {string} jobName The job name.
 * @param {*=} optData data for the job.
 * @param {Object=} optOpts Job specific options.
 * @param {Function=} optCb callback when job is created.
 * @constructor
 */
var Create = module.exports = function(jobName, optData, optOpts, optCb) {
  this.client = kickRedis.client();

  this.name = jobName;
  this.data = null;

  this.job = {};

  // optData should be a function (the callback)
  // or any other value (used as actual data)
  if ( _.isFunction(optData) ) {

  }
};

/**
 * Save the new job.
 *
 * @return {when.Promise} a promise.
 */
Create.prototype.save = function() {

};
