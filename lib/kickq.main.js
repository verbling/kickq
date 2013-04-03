/**
 * @fileoverview The public API of Kickq library.
 *
 */


var kconfig   = require('./utility/config'),
    CreateJob = require('./control/create.ctrl'),
    ProcessJob = require('./control/process.ctrl'),
    Queue = require('./model/queue.model'),
    kerror    = require('./utility/kerror');

/**
 * The Kickq class
 *
 * @constructor
 */
var Kickq = module.exports = function Kickq() {

};

// config static method
Kickq.config = kconfig.set;

// expose error codes
Kickq.error = kerror;

// expose Queue constructor
Kickq.Queue = Queue;

/**
 * Create a job.
 *
 * @param {string} jobName The job name.
 * @param {*=} optData data for the job.
 * @param {Object=} optOpts Job specific options.
 * @param {Function=} optCb callback when job is created.
 * @return {when.Promise}
 */
Kickq.prototype.create = function(jobName, optData, optOpts, optCb) {
  var createJob = new CreateJob(jobName, optData, optOpts, optCb);

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
Kickq.prototype.process = function(jobName, optOpts, optCb) {
  var worker = new ProcessJob(jobName, optOpts, optCb);

  worker.work();
};


