/**
 * @fileoverview The public API of Kickq library.
 *
 */
var EventEmitter = require('events').EventEmitter;

var when = require('when');
var logg = require('logg');
var log = logg.getLogger('kickq.main');


var kconfig = require('./utility/config');
var klogger = require('./utility/klogger');
var kmetrics = require('./control/metrics.ctrl');
var CreateJob = require('./control/create.ctrl');
var Worker = require('./control/worker.ctrl');
var Queue = require('./model/queue.model');
var kerror = require('./utility/kerror');
var kRedis = require('./utility/kredis');
var JobModel = require('./model/job.model');
var Scheduler = require('./model/scheduler.model');
var WorkerGuard = require('./control/worker.guard');

var noop = function(){};

/**
 * Exposed kickq API
 */
var kickq = module.exports = new EventEmitter();

// containers for instances.
var createInstances = [];
var workerInstances = [];
var guardInstances = [];

// config static method
kickq.config = kconfig.set;

// expose error codes
kickq.error = kerror;

// expose Queue constructor
kickq.Queue = Queue;

// expose Log Levels
kickq.LogLevel = logg.Level;


// setup logging facilities
klogger.init();

// setup events emitted
klogger.on('message', kickq.emit.bind(kickq, 'message'));

var schedulerOn = false;
var scheduler;

function startScheduler() {
  if (schedulerOn || !kconfig.get('schedulerOn')) {
    return;
  }
  schedulerOn = true;

  scheduler = new Scheduler();
  scheduler.run();
}

/**
 * Reset kickq back to its original state,
 * disposes all listeners, subscriptions and references.
 *
 */
kickq.reset = function kickqReset() {
  function dispose(inst) { inst.dispose(); }
  guardInstances.forEach(dispose);
  createInstances.forEach(dispose);
  workerInstances.forEach(dispose);

  createInstances = [];
  workerInstances = [];
  guardInstances = [];

  if (schedulerOn) {
    schedulerOn = false;
    scheduler.dispose();
  }
  kconfig.reset();
  kRedis.dispose();
};


/**
 * Create a job.
 *
 * @param {string} jobName The job name.
 * @param {*=} optData data for the job.
 * @param {Object=} optOpts Job specific options.
 * @param {Function=} optCb callback when job is created.
 * @param {Object|null} optSelf context to call the consumerWorkerFn.
 * @return {when.Promise}
 */
kickq.create = function kickCreate(jobName, optData, optOpts, optCb, optSelf) {
  var createJob = new CreateJob(jobName, optData, optOpts, optCb, optSelf);
  createInstances.push(createJob);
  return createJob.save();
};


/**
 * Process a job.
 *
 * @param {Array|string} jobName the name of the job.
 * @param {Object} optOpts Process specific options.
 * @param {Function=} optCb callback when process is done.
 * @return {void} nothing.
 */
kickq.process = function kickqProcess(jobName, optOpts, optCb) {
  var worker = new Worker(jobName, optOpts, optCb);
  workerInstances.push(worker);
  worker.work();
  var workerGuard = new WorkerGuard(worker);
  workerGuard.run();
  startScheduler();
  guardInstances.push(workerGuard);
};

/**
 * TODO
 *
 * @return {[type]} [description]
 */
kickq.delete = function kickqDelete() {

};

/**
 * Get a job item.
 *
 * @param {string} jobId the job id
 * @param {Function=} optCb optional callback, called with two args:
 *   err, jobItem.
 * @param {Object=} optSelf context to invoke callback.
 * @return {when.Promise} a promise.
 */
kickq.get = function kickqGet(jobId, optCb, optSelf) {
  var def = when.defer();
  var cb = optCb || noop;
  var jobModel = new JobModel(jobId);

  jobModel.fetch().then(function(job){
    var jobPublic = job.getPublic();

    try {
      cb.call(optSelf, null, jobPublic);
    } catch(ex) {
      log.error('get() :: callback raised exception: ', ex);
      def.reject(ex);
      return;
    }

    def.resolve(jobPublic);
  }, def.reject)
    .always(jobModel.dispose);

  return def.promise;
};

/**
 * Expose Metrics
 * @type {Object}
 */
kickq.metrics = kmetrics;

