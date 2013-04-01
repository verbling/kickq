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
 */
kError.JSON = function (ex) {
  kError.Database.super_.call(this, (ex + ''), this.constructor);
  this.name = 'JSON Error';
  this.JSONexception = ex;
};
util.inherits(kError.Database, kError.Abstract);

/**
 * Invalid state in job.
 *
 * @param {Kickq.JobItem} jobItem the job item.
 */
kError.InvalidState = function (jobItem) {
  kError.Database.super_.call(this, null, this.constructor);
  this.name = 'Invalid State';
  this.state = jobItem.state;
  this.jobId = jobItem.id;
};
util.inherits(kError.Database, kError.Abstract);

/**
 * Saving on the proper queue failed.
 *
 * @param {Kickq.JobItem} jobItem the job item.
 */
kError.QueueFail = function (jobItem) {
  kError.Database.super_.call(this, null, this.constructor);
  this.name = 'Queueing Failed';
  this.state = jobItem.state;
  this.jobId = jobItem.id;
};
util.inherits(kError.Database, kError.Abstract);


/**
 * Operation timed out.
 *
 * @param {string} optMessage optional message.
 */
kError.Timeout = function (optMessage) {
  kError.Database.super_.call(this, optMessage, this.constructor);
  this.name = 'Operation Timeout';
};
util.inherits(kError.Database, kError.Abstract);

