/**
 * @fileoverview The Worker controller, handles a single worker flow.
 */
var _ = require('underscore');
var Promise = require('bluebird');
var logg = require('logg');
var log = logg.getLogger('kickq.ctrl.Worker');
var libError = require('nodeon-error');

var PopJob = require('../model/popjob.model');
var JobItem = require('../model/job.item');
var JobModel = require('../model/job.model');
var states = require('../model/states');

var noop = function(){};

/**
 * Start processing a job or an array of jobs. This method will also spin
 * up internal scheduler if run for first time.
 *
 * @param {kickq.ctrl.WorkerManager} The Worker Manager instance.
 * @param {number} workerId The worker id, a for loop counter from 0.
 * @constructor
 */
var Worker = module.exports = function(workerManager, workerId) {
  /** @type {kickq.ctrl.WorkerManager} The parent worker manager instance */
  this.workerManager = workerManager;

  /** @type {Boolean} Switch to protect double invocation on job item save */
  this.savingJobItem = false;

  /** @type {number} The worker id, a for loop counter from 0. */
  this.workerId = workerId;

  /** @type {Kickq.PopJob} The fetch model instance */
  this.popModel = new PopJob();

  /** @type {kickq.ctrl.Worker.State} The current state. */
  this.state = Worker.State.INIT;

  /** @type {kickq.model.JobItem.ProcessItem} The current Process item instance */
  this.processItem = null;

  /** @type {kickq.model.JobItem} The current Job Item */
  this.jobItem = null;

  /** @type {Number} How many times this worker has run. */
  this.processCount = 0;

  /** @type {Boolean} Indicates disposed state */
  this._disposed = false;
};

/** @enum {string} The states of the worker */
Worker.State = {
  // The worker is initializing.
  INIT: 'init',
  // waiting for a job to pop from redis (blocking left pop).
  POP_WAIT: 'pop_wait',
  // A Job item has been popped and is being prepared for processing from consumer worker.
  PRE_WORKER: 'pre_worker',
  // The job is being processed by the consumer worker.
  WORKER_RUN: 'worker_run',
  // The consumer worker finished the job successfully.
  POST_WORKER: 'post_worker',
  // The consumer worker finished with error.
  POST_WORKER_ERROR: 'post_worker_error',
  // The pop operation failed.
  POP_ERROR: 'pop_error',
  // The worker is sleeping for a while, waiting to be waked up by the manager.
  SLEEPING: 'sleeping',
  // The worker is disposed.
  DISPOSED: 'disposed',
};

/**
 * The worker main routine, will wait for a job to be fetched from redis
 * and will then invoke the actual worker.
 *
 */
Worker.prototype.startWorker = function() {
  if (this.state === Worker.State.POP_WAIT) {
    // prevent double invocation
    return;
  }

  this.processCount++;

  log.fine('startWorker() :: Waiting for job to pop from Redis, Worker id:',
    this.workerId, 'ProcessCount:', this.processCount, 'Job-Names:',
    this.workerManager.jobNames);

  this.state = Worker.State.POP_WAIT;
  this.popModel.fetch(this.workerManager.jobNames)
    .bind(this)
    .then(function(jobItem) {
      this.state = Worker.State.PRE_WORKER;
      return this._workStart(jobItem)
        .bind(this)
        .catch(this._onWorkerFail);
    })
    .catch(this._onPopFetchFail);
};

/**
 * Handle PopModel fetch() failures.
 *
 * @param {Error} err The error that occured.
 * @private
 */
Worker.prototype._onPopFetchFail = function(err) {
  log.warn('_onPopFetchFail() :: PopModel fetch() method failed, workerId:',
    this.workerId, 'Error:', err);

  this.state = Worker.State.POP_ERROR;

  // Invoke startWorker with delay.
  setTimeout(this.startWorker.bind(this), 1000);
};

/**
 * Start processing a job
 *
 * @param  {Kickq.JobItem} jobItem A job item.
 * @return {Promise} A Promise.
 * @private
 */
Worker.prototype._workStart = Promise.method(function( jobItem ) {
  if (!jobItem) {
    var err = new libError.Error('Invalid job item provided (null or undefined)');
    throw err;
  }

  log.fine('_workStart() :: Init. Worker id:', this.workerId, 'job.id:',
    jobItem.id, 'jobItem.name:', jobItem.name, '_disposed:', this._disposed,
    'processCount:', this.processCount);

  if (this._disposed) {
    this.state = Worker.State.DISPOSED;
    return;
  }

  this.jobItem = jobItem;
  this.processItem = new JobItem.ProcessItem(jobItem);
  this.processItem.processTimeout = jobItem.processTimeout;

  // setup timeout
  this.processItem.timeout = setTimeout(this.processTimeout.bind(this,
    this.processCount), jobItem.processTimeout);

  // call worker
  var consumerReturn;
  try {
    this.state = Worker.State.WORKER_RUN;
    consumerReturn = this.workerManager.consumerWorkerFn.call(
      this.selfObj,
      jobItem.getPublic(),
      jobItem.data,
      this._consumerFinishedCb.bind(this, this.processCount)
    );
  } catch (ex) {
    this._consumerThrown(this.processCount, ex);
    return;
  }

  // check for returned promise
  if (this.workerManager.consumerWorkerFn.length < 3) {
    if (consumerReturn && typeof consumerReturn.then === 'function') {
      Promise.try(consumerReturn)
        .bind(this)
        .return(null)
        .then(this._consumerFinished.bind(this, this.processCount))
        .catch(this._consumerFailed.bind(this, this.processCount));
    }
  }
});

/**
 * The consumer worker has finished and used the callback invocation.
 *
 * @param {Number} processCount The processCount this callback belongs to.
 * @param {Error|string=} optErr Optional error message.
 * @param {Function=} optDone optionally define a callback when post-processing
 *   operations are finished.
 * @private
 */
Worker.prototype._consumerFinishedCb = function(processCount, optErr, optDone) {
  log.fine('_consumerFinishedCb() :: Consumer finished. Worker Id:',
    this.workerId, 'jobId:', (this.jobItem && this.jobItem.id),
    'processCount:', this.processCount, 'Argument-processCount:', processCount,
    'Queue:', (this.jobItem && this.jobItem.name), 'Optional-Error:', optErr);

  // protect from late invocations
  if (processCount !== this.processCount) {
    return;
  }

  // determine success
  var status = true;
  if (optErr) {
    status = false;
  }
  if (_.isBoolean(optErr) && !optErr) {
    status = false;
  }

  var done = noop;
  if (_.isFunction(optDone)) {
    done = optDone;
  }

  // update process state and job item
  if (status) {
    this.state = Worker.State.POST_WORKER;
    this.processItem.state = states.Process.SUCCESS;
  } else {
    this.state = Worker.State.POST_WORKER_ERROR;
    this.processItem.state = states.Process.FAIL;
    this.processItem.error = this.jobItem.lastError = optErr;
  }

  this._saveWorker(status, done);
};

/**
 * Consumer worker has thrown an exception.
 *
 * @param {Number} processCount The processCount this callback belongs to.
 * @param {Error} ex The exception thrown.
 * @private
 */
Worker.prototype._consumerThrown = function(processCount, ex) {
  log.fine('_consumerThrown() :: Consumer worker thrown exception. Worker Id:',
    this.workerId, 'jobId:', (this.jobItem && this.jobItem.id),
    'processCount:', this.processCount, 'Argument-processCount:', processCount,
    'Queue:', this.jobItem.name, 'Exception:', ex);

  // protect from late invocations
  if (processCount !== this.processCount) {
    return;
  }

  this.state = Worker.State.POST_WORKER_ERROR;
  this.processItem.state = states.Process.FAIL;
  this.processItem.error = this.jobItem.lastError = ex;

  this._saveWorker(false, noop);
};

/**
 * Consumer finished using a promise.
 *
 * @param {Number} processCount The processCount this callback belongs to.
 * @private
 */
Worker.prototype._consumerFinished = function(processCount) {
  log.fine('_consumerFinished() :: Consumer Promise resolved. Worker Id:',
    this.workerId, 'jobId:', (this.jobItem && this.jobItem.id),
    'processCount:', this.processCount, 'Argument-processCount:', processCount,
    'Queue:', (this.jobItem && this.jobItem.name));

  // protect from late invocations
  if (processCount !== this.processCount) {
    return;
  }

  this.state = Worker.State.POST_WORKER;
  this.processItem.state = states.Process.SUCCESS;

  this._saveWorker(true, noop);
};

/**
 * Consumer finished using a promise.
 *
 * @param {Number} processCount The processCount this callback belongs to.
 * @param {Error} err The error.
 * @private
 */
Worker.prototype._consumerFailed  = function(processCount, err) {
  log.fine('_consumerFailed() :: Consumer Promise rejected. Worker Id:',
    this.workerId, 'jobId:', (this.jobItem && this.jobItem.id),
    'processCount:', this.processCount, 'Argument-processCount:',
    processCount, 'Queue:', (this.jobItem && this.jobItem.name), 'Error:', err);

  // protect from late invocations
  if (processCount !== this.processCount) {
    return;
  }

  this.state = Worker.State.POST_WORKER_ERROR;
  this.processItem.state = states.Process.FAIL;
  this.processItem.error = this.jobItem.lastError = err;

  this._saveWorker(false, noop);
};


/**
 * Save the processed job item state.
 *
 * @param {Boolean} status The outcome of the worker processing.
 * @param {Function} cb optionally define a callback when post-processing
 *   operations are finished.
 * @private
 */
Worker.prototype._saveWorker = function(status, cb) {
  if (this._disposed) {
    this.state = Worker.State.DISPOSED;
    return;
  }

  if (this.savingJobItem) {
    return;
  }
  this.savingJobItem = true;

  // clear timeout
  clearTimeout(this.processItem.timeout);
  this.processItem.timeout = null;

  // save process time
  this.processItem.processTime = Date.now() - this.processItem.startTime;

  // update the job with the process item
  this.jobItem.addProcessItem(this.processItem);

  // update worker model
  var jobModel = new JobModel(this.jobItem);

  jobModel.processed(status)
    .bind(this)
    .finally(function() {
      this.savingJobItem = false;
      log.finest('_saveWorker() :: Model finished process operation. Worker Id:',
        this.workerId, 'jobId:', (this.jobItem && this.jobItem.id),
        'ProcessCount:', this.processCount);
      jobModel.dispose();
      // unregister work and job
      this.processItem = null;
      this.jobItem = null;
      cb();
      this.startWorker();
    });
};

/**
 * Invoked when consumer worker fails to respond
 * during the defined time duration.
 *
 */
Worker.prototype.processTimeout = function() {
  log.fine('processTimeout() :: Init. Worker Id:', this.workerId, 'jobId:',
    (this.jobItem && this.jobItem.id), 'Queue:', (this.jobItem && this.jobItem.name),
    'processTimeout:', (this.jobItem && this.jobItem.processTimeout),
    'processCount:', this.processCount);

  if (this._disposed) {
    this.state = Worker.State.DISPOSED;
    return;
  }

  // defense
  if ( !(this.processItem instanceof JobItem.ProcessItem) ) {
    this.startWorker();
    return;
  }

  // save process time
  this.processItem.processTime = Date.now() - this.processItem.startTime;

  // update process state and job item
  this.processItem.state = states.Process.GHOST;
  this.processItem.error = this.jobItem.lastError = 'processing timed out';

  // update the job with the process item
  this.jobItem.addProcessItem(this.processItem);

  // update worker model
  var jobModel = new JobModel(this.jobItem);
  jobModel.processed(false, true)
    .bind(this)
    .finally(function() {
      jobModel.dispose();
      this.processItem = null;
      this.jobItem = null;
      this.startWorker();
    });
};

/**
 * Dispose current instance, references, timeouts, everything.
 *
 * Instance becomes unusable after this method is invoked.
 */
Worker.prototype.dispose = function() {
  this.state = Worker.State.DISPOSED;

  // cut the oxygen
  this.startWorker = this.processTimeout = this._workFinish = noop;

  this._disposed = true;

  this.popModel.dispose();

  this.processItem = null;
  this.jobItem = null;
};

/**
 * Triggers when this._workStart() method fails
 *
 * @param {Error} err the error.
 * @private
 */
Worker.prototype._onWorkerFail = function(err) {
  log.fine('_onWorkerFail() :: Consumer callback failed. Worker Id:',
    this.workerId, 'err: ', err);

  this.state = Worker.State.POST_WORKER_ERROR;
  this._workFinish(err);
};
