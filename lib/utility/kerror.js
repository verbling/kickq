/*jshint camelcase:false */
/**
 * @fileoverview kickq error codes.
 */

var util = require('util');

var kerror = module.exports = {};

/**
 * The abstract error which all errors extend.
 *
 * @param {string=} optMsg Error Message.
 * @param {Object=} optCtor Calee constructor.
 */
kerror.Abstract = function (optMsg, optConstr) {
  Error.call(this);
  Error.captureStackTrace(this, optConstr || this);

  this.message = optMsg || 'Error';
  this.name = 'Abstract Error';
};
util.inherits(kerror.Abstract, Error);

/**
 * Generic database kerror.
 *
 * @param {string} msg the message.
 */
kerror.Database = function (msg) {
  kerror.Database.super_.call(this, msg, this.constructor);
  this.name = 'Database Error';
};
util.inherits(kerror.Database, kerror.Abstract);

/**
 * JSON encoding of data failed.
 *
 * @param {Error} ex the JSON exception
 */
kerror.JSON = function (ex) {
  kerror.Database.super_.call(this, msg, this.constructor);
  this.name = 'JSON Error';
  this.JSONexception = ex;
};
util.inherits(kerror.Database, kerror.Abstract);

/**
 * Invalid state in job.
 *
 * @param {JobItem} jobItem the job item.
 */
kerror.InvalidState = function (jobItem) {
  kerror.Database.super_.call(this, msg, this.constructor);
  this.name = 'Invalid State';
  this.state = jobItem.state;
  this.jobId = jobItem.id;
};
util.inherits(kerror.Database, kerror.Abstract);

