/**
 * @fileoverview Guards the worker and ensures it is running.
 */


var Worker = require('./worker.ctrl.js');
var noop = function(){};

/**
 * Start processing a job or an array of jobs. This method will also spin
 * up internal scheduler if run for first time.
 *
 * @param {Array|string} worker The Process ctrl instance.
 * @constructor
 */
var Guard = module.exports = function(worker) {

  this.worker = worker;
};
