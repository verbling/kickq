/**
 * @fileOverview The master control manager of workers, based on concurent
 *   workers will launch as many as needed.
 */

var _ = require('underscore');
// var Promise = require('bluebird');
var logg = require('logg');
var log = logg.getLogger('kickq.ctrl.Worker');
// var libError = require('nodeon-error');

var WorkerCtrl = require('./worker.ctrl');

/**
 * Start processing a job or an array of jobs. This method will also spin
 * up internal scheduler if run for first time.
 *
 * @param {Array|string} jobName A job name or an array of job names.
 * @param {Object=} optOpts optionally define worker specific options.
 * @param {Function} optCb Callback to invoke.
 * @param {Object|null} optSelf to call the consumerWorkerFn.
 * @constructor
 */
var WorkerManager = module.exports = function() {

  /** @type {Function(string, *, Function)} The consumer worker */
  this.consumerWorkerFn = null;

  /** @type {Object|null} context to call the consumerWorkerFn */
  this.selfObj = null;

  /** @type {Array} The job names this worker will pull from the queue */
  this.jobNames = [];

  /** @type {Object} Map of options as passed from the consumer worker */
  this.options = {};

  /** @type {number} Concurrent jobs to run on this instance */
  this.concurrentJobs = 1;

  /** @type {boolean} if instance has been disposed */
  this._disposed = false;

  /**
   * @type {Array} Contains the workers.
   */
  this.workers = [];

  this._parseArguments(arguments);

  //
  // Configure the worker, set operational parameters.
  //
  if ( _.isNumber(this.options.concurrentJobs) ) {
    this.concurrentJobs = this.options.concurrentJobs;
  }
};

/**
 * Validate passed arguments.
 *
 * @param  {Array} args Arguments of the contructor.
 * @private
 * @throws {Error|TypeError} if invalid arguments.
 */
WorkerManager.prototype._parseArguments = function(args) {
  var jobName = args[0];
  var optOpts = args[1];
  var optCb   = args[2];
  var optSelf = args[3];

  // check for callback
  if (_.isFunction(optCb)) {
    this.consumerWorkerFn = optCb;
  }
  if (_.isFunction(optOpts)) {
    this.consumerWorkerFn = optOpts;
  }

  // check for context
  if (_.isObject(optSelf)) {
    this.selfObj = optSelf;
  }
  if (_.isObject(optCb)) {
    this.selfObj = optCb;
  }

  // check for options
  if (_.isObject(optOpts)) {
    this.options = optOpts;
  }

  // check for job names
  if (_.isArray(jobName)) {
    this.jobNames = jobName;
  }
  if (_.isString(jobName)) {
    this.jobNames.push(jobName);
  }

  if (!_.isFunction(this.consumerWorkerFn)) {
    throw new TypeError('No worker callback provided');
  }
  if ( 0 === this.jobNames.length ) {
    throw new Error('No valid jobs found for processing');
  }
};

/**
 * spin up the workers.
 *
 */
WorkerManager.prototype.start = function() {
  if (this._disposed) {
    return;
  }

  log.log(logg.Level.FINEST, 'startWorkers() :: concurrent jobs: ' +
    this.concurrentJobs);

  for (var i = 0; i < this.concurrentJobs; i++) {
    var workerCtrl = new WorkerCtrl(this, i);
    workerCtrl.startWorker();
    this.workers.push(workerCtrl);
  }
};
