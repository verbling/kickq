/**
 * @fileoverview Process jobs interface.
 */
var _ = require('underscore');
var Map = require('collections/map');
var when = require('when');

var FetchModel = require('../model/fetch.model');
var JobItem = require('../model/job.item');
var JobModel = require('../model/job.model');
var states = require('../model/states');

var noop = function(){};

/**
 * Start processing a job or an array of jobs. This method will also spin
 * up internal scheduler if run for first time.
 *
 * @param {Array|string} jobName A job name or an array of job names.
 * @param {Object=} optOpts optionally define worker specific options.
 * @param {Function} optCb Callback to invoke.
 * @param {Object|null} context to call the consumerWorkerFn.
 * @return {void}
 */
var Process = module.exports = function(jobName, optOpts, optCb, optSelf) {

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

  /** @type {number} keeps count of queries for jobs done to db */
  this.jobQueries = 0;

  /** @type {Kickq.FetchModel} The fetch model instance */
  this.fetchModel = new FetchModel();

  /** @type {boolean} Master throttle switch */
  this._throttleOn = false;

  /** @type {Array} track Master Loop calls */
  this._throttleCall = [];

  /** @type {?number} setTimeout index */
  this._throttleTimeout = null;

  /** @type {boolean} if instance has been disposed */
  this._disposed = false;

  /**
   * @type {number} The total amount of Master Loop invocations
   *   to keep track of.
   */
  this.throttleBufferLen = this.concurrentJobs + Process.param.BUFFER_GRACE;

  /**
   * @type {collections.Map.<Process.Item>} Will contain all the job
   *       items that are currently processing.
   * @private
   */
  this._processing = new Map();

  this._parseArguments(arguments);

  this._configure();
};

/**
 * A map of internal operational parameters.
 *
 * @type {Object}
 */
Process.param = {
  // value is arbitrary, possibly needs tuning when faced with real world
  BUFFER_GRACE: 5,

  // How soon between last call should throttle trigger?
  // set to 5 seconds
  THROTTLE_LIMIT: 5000,

  // After throttle triggers how long to wait.
  // Wait 5 seconds
  THROTTLE_TIMEOUT: 5000
};

/**
 * spin up the worker.
 */
Process.prototype.work = function() {
  this._masterLoop();
};

/**
 * Validate passed arguments.
 *
 * @param  {Array} args Arguments of the contructor.
 * @private
 * @throws {Error|TypeError} if invalid arguments.
 */
Process.prototype._parseArguments = function(args) {
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
  if ( 0 === this.jobNames.length ){
    throw new Error('No valid jobs found for processing');
  }
};

/**
 * Configure the worker, set operational parameters.
 *
 * @private
 */
Process.prototype._configure = function() {
  if ( _.isNumber(this.options.concurrentJobs) ) {
    this.concurrentJobs = this.options.concurrentJobs;
  }

  this.throttleBufferLen = this.concurrentJobs + Process.param.BUFFER_GRACE;
};


/**
 * The master loop that supplies with jobs the callback.
 *
 * @param {Error=} optErr also poses as error callback for the worker model
 *                        fetch promise, used for tracking concurent requests.
 * @private
 */
Process.prototype._masterLoop = function(optErr) {
  if (this._disposed) {
    return;
  }

  if ( optErr ) {
    this.jobQueries--;
    // don't burn
    if (this._throttleLoop()) {
      return;
    }
  }

  var processingCount = this._processing.keys().length + this.jobQueries;

  for (; processingCount < this.concurrentJobs; processingCount++) {
    // whenjs v2.0 guarantees async fullfilment of promises, therefore
    // there is no possible race condition for cases where worker promise
    // rejects synchronously.
    this.fetchModel.fetch( this.jobNames ).then(
      this._workStart.bind(this),
      this._masterLoop.bind(this)
    ).then(noop, this._onWorkerFail.bind(this));
  }
};

/**
 * Will throttle calls to the Master Loop for edge cases, e.g. database is down.
 *
 * @return {boolean} If true stop execution.
 */
Process.prototype._throttleLoop = function() {

  if (this._throttleOn || this._disposed) {
    return true;
  }

  this._throttleCall.push(Date.now());

  var callLen = this._throttleCall.length;

  // enforce buffer behavior
  if (callLen > this.throttleBufferLen) {
    this._throttleCall.splice(0, callLen - this.throttleBufferLen);
  }

  // check if throttle limit reached
  if (Date.now() - this._throttleCall[0] > Process.param.THROTTLE_LIMIT) {
    // not reached
    return false;
  }

  // trigger throttle
  this._throttleOn = true;

  this._throttleTimeout = setTimeout(
    function(){
      this._throttleOn = false;
      this._throttleCall = [];
      this._masterLoop();
    }.bind(this),
    Process.param.THROTTLE_TIMEOUT
  );

  return true;
};

/**
 * Start processing a job
 *
 * @param  {Kickq.JotItem} job A job item.
 * @return {void}
 * @private
 */
Process.prototype._workStart = function( job ) {
  if (this._disposed) {
    return;
  }

  // substract queries
  this.jobQueries--;

  var processItem = new JobItem.ProcessItem(job);

  // setup timeout
  processItem.timeout = setTimeout(
    this._workTimeout.bind(this, job, processItem),
    job.jobTimeout
  );

  // register work
  this._processing.set(job.id, processItem);

  // call worker
  var consumerReturn = this.consumerWorkerFn.call(
    this.selfObj,
    job,
    job.data,
    this._workFinish.bind(this, job)
  );

  // check for returned promise
  if (when.isPromise(consumerReturn)) {
    consumerReturn.then(
      this._workFinish.bind(this, job),
      this._workFinish.bind(this, job)
    );
  }


};

/**
 * Invoked when consumer worker responds.
 *
 * @param  {Kickq.JobItem} job The job item.
 * @param  {string=} optErr Optional error message.
 * @private
 */
Process.prototype._workFinish = function( job, optErr ) {
  if (this._disposed) {
    return;
  }

  // get process item
  var processItem = this._processing.get(job.id);

  // The job could have timed out or already be complete (double invocation).
  if ( !(processItem instanceof JobItem.ProcessItem) ) {
    this._masterLoop();
    return;
  }

  // clear timeout
  clearTimeout(processItem.timeout);

  // unregister work
  this._processing.delete(job.id);

  var success = _.isString(optErr) && optErr.length;

  // save process time
  processItem.processTime = Date.now() - processItem.startTime;

  // update process state and job item
  if (success) {
    processItem.state = states.Process.SUCCESS;
  } else {
    processItem.state = states.Process.FAIL;
    processItem.errorMessage = job.lastError = optErr;
  }

  // update the job with the process item
  job.addProcessItem(processItem);

  // update worker model
  var jobModel = new JobModel(job);
  jobModel.processed(success).ensure( this._masterLoop.bind(this) );
};

/**
 * Invoked when consumer worker fails to respond
 * during the defined time duration.
 *
 * @param  {Kickq.JobItem} job The job item.
 * @private
 */
Process.prototype._workTimeout = function( job ) {
  if (this._disposed) {
    return;
  }

  // get process item
  var processItem = this._processing.get(job.id);

  // defense
  if ( !(processItem instanceof JobItem.ProcessItem) ) {
    return this._masterLoop();
  }

  // unregister work
  this._processing.delete(job.id);

  // save process time
  processItem.processTime = Date.now() - processItem.startTime;

  // update process state and job item
  processItem.state = states.Process.GHOST;

  // update worker model
  var jobModel = new JobModel(job);
  jobModel.processed(false, true).ensure( this._masterLoop.bind(this) );
};

/**
 * Dispose current instance, references, timeouts, everything.
 *
 * Instance becomes unusable after this method is invoked.
 */
Process.prototype.dispose = function() {
  // cut the oxygen
  this._masterLoop = this._workTimeout = this._workFinish = noop;

  this._disposed = true;

  if( this._throttleOn ) {
    clearTimeout(this._throttleTimeout);
  }

  this.fetchModel.dispose();

  this._processing.clear();
};

/**
 * Triggers when this._workStart() method fails
 *
 * @param  {string} err the error message.
 * @private
 */
Process.prototype._onWorkerFail = function(err) {
  console.log('Worker failed: ', err);
};
