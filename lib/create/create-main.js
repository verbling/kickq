/**
 * @fileoverview Create a new job.
 */

var _     = require('underscore'),
    when  = require('when');

var kconfig   = require('../utility/config'),
    kickRedis = require('../utility/kredis'),
    JobK      = require('../core/job-class');


var noop = function(){};

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

  /** @type {redis.CreateClient} redis client */
  this.client = kickRedis.client();

  /** @type {when.Deferred} The deferred to resolve when save completes */
  this.defer = when.defer();

  this.job = new JobK();

  this.name = this.job.name = jobName;

  this.data = null;
  this.opts = null;
  this.done = noop;

  // optData should be a function (the callback)
  // or any other value (used as actual data)
  if ( !_.isFunction(optData) ) {
    this.data = optData;
  }

  if ( !_.isFunction(optOpts) ) {
    this.opts = optOpts;
  }

  if ( _.isFunction(optCb) ) {
    this.done = optCb;
  }

  // process all options
  this._initialize();

};

/**
 * Parse all the options and configurations and update the JobK object.
 *
 * @private
 */
Create.prototype.initialize = function() {

  // see if config has any specific options for this job.
  var configOpts = kconfig.getJob(this.name);


};

/**
 * Save the new job.
 *
 * @return {when.Promise} a promise.
 */
Create.prototype.save = function() {

};
