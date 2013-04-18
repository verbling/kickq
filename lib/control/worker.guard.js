/**
 * @fileoverview Guards the worker and ensures it is running.
 */

var logg = require('logg');
var log = logg.getLogger('kickq.ctrl.WorkerGuard');

var Worker = require('./worker.ctrl.js');
var JobItem = require('../model/job.item');
var kconfig = require('../utility/config');

var noop = function(){};

/**
 * Start processing a job or an array of jobs. This method will also spin
 * up internal scheduler if run for first time.
 *
 * @param {!Kickq.ProcessItem} worker The Process ctrl instance.
 * @constructor
 */
var Guard = module.exports = function(worker) {
  if ( !(worker instanceof Worker) ) {
    throw new TypeError('Argument not an instance of kickq.Worker');
  }

  log.info('Ctor() :: Init');

  /** @type {kickq.Worker} The worker instance to guard */
  this.worker = worker;

  /** @type {number} interval num */
  this._timeInterval = kconfig.get('guardInterval');

  /** @type {?Object} setInterval return value */
  this._interval = null;

  /** @type {redis.CreateClient} The blocking client used by popModel */
  this.clientBlocking = this.worker.popModel.clientBlocking;

  /** @type {boolean} Redis connection, assumes true. */
  this._connected = true;
};

/**
 * Start the guard.
 *
 */
Guard.prototype.run = function() {

  this.clientBlocking.on('error', this._onError.bind(this));

  this._interval = setInterval(this._guard.bind(this), this._timeInterval);

};

/**
 * Blocking client on error. Check if connection error.
 *
 * @param  {string} err the error
 * @private
 */
Guard.prototype._onError = function(err) {
  if (!err.match(/ECONNREFUSED/)) {
    log.warn('_onError() :: Non Redis error: ', err);
    return;
  }

  if (!this._connected) {
    return;
  }

  this._connected = false;
  log.error('_onError() :: Redis Down! Waiting for reconnect. Error: ', err);

  this.worker.forceThrottle();

  this.clientBlocking.once('ready', this._onReady.bind(this));
};

/**
 * Handle "ready" event from redis indicating connection is back up.
 *
 * @private
 */
Guard.prototype._onReady = function() {
  log.info('_onReady() :: redis is back up. Resuming operations...');
  if (this._connected) {
    // already here (!)
    return;
  }

  this._connected = true;
  this.worker.stopForceThrottle();

  // CPR
  setTimeout(this.worker.masterLoop.bind(this.worker));
};


/**
 * The actual guard operation
 *
 * @private
 */
Guard.prototype._guard = function() {
  try {
    log.finest('_guard() :: Init. Guard check starting...');
    if (!this._checkProcessingWorkers()) {
      return;
    }

    if (!this._checkWorkerCapacity()) {
      return;
    }

    if (!this._checkThrottler()) {
      return;
    }
  } catch(ex) {
    log.error('_guard() :: Failed!', ex);
  }
};

/**
 * Check the currently processing workers.
 *
 * @return {boolean} If check passes.
 * @private
 */
Guard.prototype._checkProcessingWorkers = function() {
  // how many processes run..
  var count = this.worker.processing.keys().length;

  if (0 === count) {
    // not our problem
    return true;
  }

  var now = Date.now();
  var processingTimeDiff;
  this.worker.forEach(function(processItem, jobId) {
    processingTimeDiff = now - processItem.startTime;

    // give 50% grace in comparison
    if ((processItem.processTimeout * 1.5) > processingTimeDiff) {
      return;
    }


    // A ghost worker not collected...
    // get the job
    var job = this.worker.jobs.get(jobId);
    // defense
    if ( !(job instanceof JobItem)) {
      log.warn('_checkProcessingWorkers() :: Rogue process item detected!. ' +
        'Job id lost: ' + jobId);
      this.worker.rogueProcess(jobId, processItem);
      return;
    }

    log.warn('_checkProcessingWorkers() :: Ghost process detected. ' +
      'Invoking manual timeout. Processing for: ' + processingTimeDiff +
      ' Process timeout:' + processItem.processTimeout);

    this.worker.processTimeout(job);

  }, this);

  return true;

};

/**
 * Check the worker's capacity (min / max).
 *
 * @return {boolean} If check passes.
 * @private
 */
Guard.prototype._checkWorkerCapacity = function() {
  // how many processes run..
  var count = this.worker.processing.keys().length;

  if (0 === count) {
    // Check if throttled
    if (this.worker.hasThrottle()) {
      // not our problem
      return true;
    }

    // no throttle and no jobs running, check DB
    if (this._connected) {
      return true;
    }

    log.warn('_checkWorkerCapacity() :: Redis seems to be down.');
    return true;
  }

  if (this.worker.concurrentJobs < count) {
    log.warn('_checkWorkerCapacity() :: Capacity exceeded! Processing jobs: ',
      count, ' Capacity: ', this.worker.concurrentJobs);
  }

  return true;
};

/**
 * Check
 *
 * @return {boolean} If check passes.
 * @private
 */
Guard.prototype._checkThrottler = function() {

  if (!this.worker.hasThrottle()) {
    return true;
  }

  // check throttle's health
  var duration = Date.now() - this.worker.getThrottleStart();

  // give 50% grace
  if ( (Worker.param.THROTTLE_TIMEOUT * 1.5) > duration) {
    return true;
  }

  // ignore check if not connected
  if (!this._connected) {
    return true;
  }

  log.warn('_checkThrottler() :: Throttle exceeded timeout. Throttle duration: ',
    duration, ' Throttle time limit:', Worker.param.THROTTLE_TIMEOUT);

  this.worker.throttleRestore();

  return true;

};

/**
 * Dispose the guard.
 *
 */
Guard.prototype.dispose = function() {
  clearInterval(this._interval);

};
