/**
 * @fileOverview The master control manager of workers, based on concurent
 *   workers will launch as many as needed.
 */

var _ = require('underscore');
var Map = require('collections/map');
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
var Worker = module.exports = function() {

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

  /** @type {boolean} Master throttle switch */
  this._throttleOn = false;

  /** @type {Array} track Master Loop calls */
  this._throttleCall = [];

  /** @type {?number} setTimeout index */
  this._throttleTimeout = null;

  /** @type {?number} JS Timestamp */
  this._throttleStart = null;

  /** @type {boolean} Forced throttle */
  this._throttleForce = false;

  /** @type {boolean} if instance has been disposed */
  this._disposed = false;

  /** @type {number} Times the master loop has run */
  this.loopCount = 0;

  /**
   * @type {number} The total amount of Master Loop invocations
   *   to keep track of.
   */
  this.throttleBufferLen = this.concurrentJobs + Worker.param.BUFFER_GRACE;

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
 * A map of internal operational parameters.
 *
 * @type {Object}
 */
Worker.param = {
  // value is arbitrary, possibly needs tuning when faced with real world
  BUFFER_GRACE: 5,

  // How soon between last call should throttle trigger?
  THROTTLE_LIMIT: 50,

  // After throttle triggers how long to wait.
  // Wait 5 seconds
  THROTTLE_TIMEOUT: 5000
};

/**
 * Validate passed arguments.
 *
 * @param  {Array} args Arguments of the contructor.
 * @private
 * @throws {Error|TypeError} if invalid arguments.
 */
Worker.prototype._parseArguments = function(args) {
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
Worker.prototype.start = function() {
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
