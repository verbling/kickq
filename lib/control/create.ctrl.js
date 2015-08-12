/**
 * @fileoverview Create a new job.
 */

var _ = require('underscore');
var Promise = require('bluebird');

var logg = require('logg');
var log = logg.getLogger('kickq.ctrl.Create');

var JobItem = require('../model/job.item');
var JobModel = require('../model/job.model');

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
  if ( _.isFunction(optOpts) ) {
    this.done = optOpts;
  }
  if ( _.isFunction(optData) ) {
    this.done = optData;
  }

  // process all options
  this.job.initialize(this.opts);

};

/**
 * Save the new job.
 *
 * @return {Promise} a promise.
 */
Create.prototype.save = Promise.method(function kickqCreateSave() {
  var jobModel = new JobModel(this.job);

  return jobModel.create()
    .bind(this)
    .then(this._onSuccess)
    .catch(this._onFail);
});

/**
 * Save success callback.
 *
 * @return {Promise} a promise.
 * @private
 */
Create.prototype._onSuccess = Promise.method(function kickqCreateOnSuccess() {
  if (this._disposed) {
    return;
  }

  var publicJobItem = this.job.getPublic();

  this.done(null, publicJobItem, publicJobItem.hotjobPromise);

  return publicJobItem;
});

/**
 * Save success callback.
 *
 * @param {Error} err Error object.
 * @return {Promise} a promise.
 * @private
 */
Create.prototype._onFail = Promise.method(function kickqCreateOnFail(err) {
  if (this._disposed) {
    return;
  }

  // ground callback exceptions
  try {
    this.done(err);
  } catch(ex) {
    // do nothing
    log.fine('_onFail() :: Create Callback failed with:', ex);
  } finally {
    throw err;
  }
});

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
