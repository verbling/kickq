/**
 * @fileoverview Bootstrap of Kickq library.
 *
 */


var kconfig = require('kickq.config');

/**
 * The Kickq class
 *
 * @constructor
 */
var Kickq = module.exports = function Kickq() {

};

// config static method
Kickq.config = kconfig.set;


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

};


