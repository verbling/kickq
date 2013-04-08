/**
 * @fileoverview Create a new job.
 */

var _     = require('underscore'),
    when  = require('when');

var JobItem   = require('../model/job.item'),
    JobModel  = require('../model/job.model');

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

  /** @type {when.Deferred} The deferred to resolve when save completes */
  this.defer = when.defer();

  this.job = new JobItem();

  this.name = this.job.name = jobName;

  this.opts = {};
  this.done = noop;

  /** @type {boolean} if instance has been disposed */
  this._disposed = false;

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
  this.job.initialize(this.opts);

};

/**
 * Save the new job.
 *
 * @return {when.Promise} a promise.
 */
Create.prototype.save = function() {

  var jobModel = new JobModel(this.job);

  jobModel.save().then(this._onSuccess.bind(this), this._onFail.bind(this));

  return this.defer.promise;
};

/**
 * Save success callback.
 *
 * @private
 */
Create.prototype._onSuccess = function() {
  if (this._disposed) {
    return;
  }

  var publicJobItem = this.job.getPublic();

  this.done(null, publicJobItem);
  this.defer.resolve(publicJobItem);
};

/**
 * Save success callback.
 *
 * @param {Error} ex Error object.
 * @private
 */
Create.prototype._onFail = function(ex) {
  if (this._disposed) {
    return;
  }

  this.done(ex);
  this.defer.reject(ex);
};

/**
 * Dispose current instance, references, timeouts, everything.
 *
 * Instance becomes unusable after this method is invoked.
 */
Create.prototype.dispose = function() {
  // cut the oxygen
  this.save = noop;

  this._disposed = true;

  this.job = null;
};
