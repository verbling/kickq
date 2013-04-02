/**
 * @fileoverview Process jobs interface.
 */
var _ = require('underscore');

/**
 * Start processing a job or an array of jobs. This method will also spin
 * up internal scheduler if run for first time.
 *
 * @param  {Array|string} jobName A job name or an array of job names.
 * @param  {Object=} optOpts optionally define worker specific options.
 * @param  {Function} optCb Callback to invoke.
 * @return {void}
 */
var Process = module.exports = function(jobName, optOpts, optCb) {

  //
  // Validate passed arguments
  //
  this.cb = null;
  if (_.isFunction(optCb)) {
    this.cb = optCb;
  }
  if (_.isFunction(optOpts)) {
    this.cb = optOpts;
  }

  this.options = {};
  if (_.isObject(optOpts)) {
    this.optOpts = optOpts;
  }

  this.jobs = [];
  if (_.isArray(jobName)) {
    this.jobs = jobName;
  }
  if (_.isString(jobName)) {
    this.jobs.push(jobName);
  }

  if (!_.isFunction(this.cb)) {
    throw new TypeError('No worker callback provided');
  }
  if ( 0 === this.jobs.length ){
    throw new Error('No valid jobs found for processing');
  }

  //
  // Spin up
  //
  this._masterLoop();

};

/**
 * The master loop that supplies with jobs the callback.
 *
 * @private
 */
Process.prototype._masterLoop = function() {

};
