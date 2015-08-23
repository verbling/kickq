/*jshint camelcase:false */
/**
 * @fileoverview kickq error codes.
 */

var libError = require('nodeon-error');

var util = require('util');

var kError = module.exports = libError;

libError.setName('kickq');

/**
 * Invalid state in job.
 *
 * @param {kickq.JobItem} jobItem the job item.
 * @constructor
 * @extends {kickq.error.Abstract}
 */
kError.InvalidState = function (jobItem) {
  kError.InvalidState.super_.call(this, null, this.constructor);
  this.name = 'Invalid State';
  this.state = jobItem.state;
  this.jobId = jobItem.id;
};
util.inherits(kError.InvalidState, libError.BaseError);

/**
 * Saving on the proper queue failed.
 *
 * @param {kickq.JobItem} jobItem the job item.
 * @param {string=} optMsg optional message.
 * @constructor
 * @extends {kickq.error.Abstract}
 */
kError.QueueFail = function (jobItem, optMsg) {
  kError.QueueFail.super_.call(this, optMsg, this.constructor);
  this.name = 'Queueing Failed';
  this.state = jobItem.state;
  this.jobId = jobItem.id;
};
util.inherits(kError.QueueFail, libError.BaseError);


/**
 * Operation timed out.
 *
 * @param {string} optMessage optional message.
 * @constructor
 * @extends {kickq.error.Abstract}
 */
kError.Timeout = function (optMessage) {
  kError.Timeout.super_.call(this, optMessage, this.constructor);
  this.name = 'Operation Timeout';
};
util.inherits(kError.Timeout, libError.BaseError);

/**
 * No record found for job id.
 *
 * @param {string} jobId the job id.
 * @param {string=} optMessage the message.
 * @constructor
 * @extends {kickq.error.Abstract}
 */
kError.NoRecord = function (jobId, optMessage) {
  kError.NoRecord.super_.call(this, optMessage, this.constructor);
  this.name = 'No job record';
  this.jobId = jobId;
};
util.inherits(kError.NoRecord, libError.BaseError);

