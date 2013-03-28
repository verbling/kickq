/**
 * @fileoverview Create a new job.
 */

var _     = require('underscore'),
    when  = require('when');

var kconfig   = require('../utility/config'),
    kickRedis = require('../utility/kredis'),
    JobItem   = require('../core/job-item'),
    JobModel  = require('../core/job-model');

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

  this.job = new JobItem();

  this.name = this.job.name = jobName;

  this.opts = Object.create(null);
  this.done = noop;

  // optData should be a function (the callback)
  // or any other value (used as actual data)
  if ( !_.isFunction(optData) && 'undefined' !== typeof(optData) ) {
    this.job.data = optData;
  }

  if ( !_.isFunction(optOpts) && _.isObject(optOpts) ) {
    this.opts = optOpts;
  }

  if ( _.isFunction(optCb) ) {
    this.done = optCb;
  }

  // process all options
  this._initialize();

};

/**
 * Parse all the options and configurations and update the JobItem object.
 *
 * @private
 */
Create.prototype.initialize = function() {

  // see if config has any specific options for this job.
  var configOpts = kconfig.getJob(this.name);

  // Define all the options that needs to be examined in the config or
  // invoke options.
  var optsExamine = [
    'delay',
    'retry',
    'retryCount',
    'retryInterval',
    'tombstone',
    'tombstoneTimeout',
    'tombPromise',
  ];

  // examine existence and assign to job.
  optsExamine.forEach(function(prop){
    if ( this.opts.hasOwnProperty(prop) ) {
      this.job[prop] = this.opts[prop];
      return; //next
    }

    if ( configOpts.hasOwnProperty(prop) ) {
      this.job[prop] = configOpts[prop];
    }
  }, this);
};

/**
 * Save the new job.
 *
 * @return {when.Promise} a promise.
 */
Create.prototype.save = function() {
  var jobPromise = new JobModel(this.job).save();

  return jobPromise;
};
