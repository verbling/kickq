/**
 * Kickq
 * Kick jobs out the door, quickly.
 *
 * https://github.com/verbling/kickq
 *
 * Copyright ©2015 Verbling
 * Licensed under the MIT license.
 *
 * Authors:
 *   Thanasis Polychronakis (http://thanpol.as)
 *
 */

/**
 * @fileoverview The public API of Kickq library.
 *
 */
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');

var Promise = require('bluebird');
var logg = require('logg');
var log = logg.getLogger('kickq.main');


var kconfig = require('./utility/config');
var klogger = require('./utility/klogger');
var kmetrics = require('./control/metrics.ctrl');
var CreateJob = require('./control/create.ctrl');
var WorkerManager = require('./control/worker-manager.ctrl');
var RedisCtrl = require('./control/redis.ctrl');

// var WorkerGuard = require('./control/worker.guard');
// var MetricsModel = require('./model/metrics.model');
var Queue = require('./model/queue.model');
var kerror = require('./utility/kerror');
var kRedis = require('./utility/kredis');
var JobModel = require('./model/job.model');
var JobItem = require('./model/job.item');
var Scheduler = require('./model/scheduler.model');

var states = require('./model/states');
var kfile = require('./utility/kfile');

var noop = function(){};

/**
 * Exposed kickq API
 */
var kickq = module.exports = new EventEmitter();

// Get Version when needed
var version;
/*jshint camelcase:false */
kickq.__defineGetter__('version', function(){
  if (version) {return version;}
  var pack = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
  var packObj;
  try {packObj = JSON.parse(pack);}
    catch(ex) {packObj = {version: null};}
  version = packObj.version;
  return version;
});
// ignore set
/*jshint camelcase:false */
kickq.__defineSetter__('version', noop);


// containers for instances.
var createInstances = [];
var workerInstances = [];

// config static method
kickq.config = kconfig.set;

// expose error codes
kickq.Error = kerror;

// expose Queue constructor
kickq.Queue = Queue;

// expose JobItem
kickq.JobItem = JobItem;

// expose the file helpers
kickq.file = kfile;

// expose states enums
kickq.states = states;

// expose Log Levels
kickq.LogLevel = logg.Level;

// expose Logger
kickq.logg = logg;

// setup logging facilities
klogger.init();

// setup events emitted
klogger.on('message', kickq.emit.bind(kickq, 'message'));

// Expose Metrics
kickq.metrics = kmetrics;

var hasBooted = false;
var scheduler;
var redisCtrl;

/**
 * Will boot once the kickq services, happens only on process() method
 * invocation because that's the worker state we need to watch for.
 *
 */
function bootKickq() {
  if (hasBooted) {
    return;
  }
  hasBooted = true;

  //
  // Redis Watcher
  //
  redisCtrl = RedisCtrl.getInstance();
  redisCtrl.init();

  //
  // Start Scheduler
  //
  if (kconfig.get('schedulerOn')) {
    scheduler = new Scheduler();
    scheduler.run();
  }
}

/**
 * Reset kickq back to its original state,
 * disposes all listeners, subscriptions and references.
 *
 */
kickq.reset = function kickqReset() {
  function dispose(inst) { inst.dispose(); }

  createInstances.forEach(dispose);
  workerInstances.forEach(dispose);

  createInstances = [];
  workerInstances = [];

  if (hasBooted) {
    hasBooted = false;
    redisCtrl.dispose();
    scheduler.dispose();
  }
  kconfig.reset();
  kRedis.dispose();
  klogger.hookOnConfig();
};


/**
 * Create a job.
 *
 * @param {string} jobName The job name.
 * @param {*=} optData data for the job.
 * @param {Object=} optOpts Job specific options.
 * @param {Function=} optCb callback when job is created.
 * @param {Object|null} optSelf context to call the consumerWorkerFn.
 * @return {Promise}
 */
kickq.create = function kickCreate(jobName, optData, optOpts, optCb, optSelf) {
  log.info('create() :: Init. name:', jobName);
  var createJob = new CreateJob(jobName, optData, optOpts, optCb, optSelf);
  createInstances.push(createJob);
  return createJob.save();
};


/**
 * Process a job.
 *
 * @param {Array|string} jobName the name of the job.
 * @param {Object|Function} optOpts Process specific options or consumer worker.
 * @param {Function=} optCb Cunsumer worker.
 * @return {void} nothing.
 */
kickq.process = function kickqProcess(jobName, optOpts, optCb) {
  log.info('process() :: Init. name:', jobName);

  bootKickq();

  var workerManager = new WorkerManager(jobName, optOpts, optCb);
  workerInstances.push(workerManager);
  workerManager.start();
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
 * @return {Promise} A promise.
 */
kickq.get = Promise.method(function(jobId, optCb, optSelf) {
  log.info('get() :: Init. jobId:', jobId);

  var cb = optCb || noop;
  var jobModel = new JobModel(jobId);

  return jobModel.fetch()
    .then(function(job){
      var jobPublic = job.getPublic();

      cb.call(optSelf, null, jobPublic);

      return jobPublic;
    })
    .catch(function(err) {
      cb.call(optSelf, err);
      if (typeof optCb !== 'function') {
        throw err;
      }
    })
    .finally(jobModel.dispose);
});
