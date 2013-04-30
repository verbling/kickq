/*jshint camelcase:false */
/**
 * @fileoverview kickq error codes.
 */

var util = require('util');

var kError = module.exports = {};

/**
 * The abstract error which all errors extend.
 *
 * @param {string=} optMsg Error Message.
 * @param {Object=} optCtor Calee constructor.
 * @constructor
 * @extends {Error}
 */
kError.Abstract = function (optMsg, optConstr) {
  Error.call(this);
  Error.captureStackTrace(this, optConstr || this);

  this.message = optMsg || 'Error';
  this.name = 'Abstract Error';
};
util.inherits(kError.Abstract, Error);

/**
 * Generic database kError.
 *
 * @param {string} msg the message.
 * @constructor
 * @extends {kickq.error.Abstract}
 */
kError.Database = function (msg) {
  kError.Database.super_.call(this, msg, this.constructor);
  this.name = 'Database Error';
};
util.inherits(kError.Database, kError.Abstract);

/**
 * JSON encoding of data failed.
 *
 * @param {Error} ex the JSON exception
 * @extends {kickq.error.Abstract}
 */
kError.JSON = function (ex) {
  kError.JSON.super_.call(this, (ex + ''), this.constructor);
  this.name = 'JSON Error';
  this.JSONexception = ex;
};
util.inherits(kError.JSON, kError.Abstract);

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
util.inherits(kError.InvalidState, kError.Abstract);

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
util.inherits(kError.QueueFail, kError.Abstract);


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
util.inherits(kError.Timeout, kError.Abstract);

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
util.inherits(kError.NoRecord, kError.Abstract);

/**
 * Invalid data parsed.
 *
 * @param {string=} optMessage the message.
 * @constructor
 * @extends {kickq.error.Abstract}
 */
kError.InvalidData = function (optMessage) {
  kError.InvalidData.super_.call(this, optMessage, this.constructor);
  this.name = 'Invalid Data';
};
util.inherits(kError.InvalidData, kError.Abstract);
