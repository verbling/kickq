/**
 * @fileoverview The public API of Kickq library.
 *
 */
var kconfig   = require('./utility/config');
var CreateJob = require('./control/create.ctrl');
var ProcessJob = require('./control/process.ctrl');
var Queue = require('./model/queue.model');
var kerror = require('./utility/kerror');
var kRedis = require('./utility/kredis');

/**
 * Exposed kickq API
 */
var kickq = module.exports;

// containers for instances.
var createInstances = [];
var workerInstances = [];

// config static method
kickq.config = kconfig.set;

// expose error codes
kickq.error = kerror;

// expose Queue constructor
kickq.Queue = Queue;

/**
 * Reset kickq back to its original state,
 * disposes all listeners, subscriptions and references.
 *
 */
kickq.reset = function() {
  function dispose(inst) {
    inst.dispose();
  }
  createInstances.forEach(dispose);
  workerInstances.forEach(dispose);

  createInstances = [];
  workerInstances = [];

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
kickq.create = function(jobName, optData, optOpts, optCb, optSelf) {
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
kickq.process = function(jobName, optOpts, optCb) {
  var worker = new ProcessJob(jobName, optOpts, optCb);
  workerInstances.push(worker);
  worker.work();
};

/**
 * TODO
 *
 * @return {[type]} [description]
 */
kickq.delete = function() {

};
