/*jshint camelcase:false */
/**
 * @fileoverview kickq error codes.
 */

var util = require('util');

var error = module.exports = {};

/**
 * The abstract error which all errors extend.
 *
 * @param {string=} optMsg Error Message.
 * @param {Object=} optCtor Calee constructor.
 */
error.Abstract = function (optMsg, optConstr) {
  Error.call(this);
  Error.captureStackTrace(this, optConstr || this);

  this.message = optMsg || 'Error';
  this.name = 'Abstract Error';
};
util.inherits(error.Abstract, Error);

/**
 * Generic database error.
 *
 * @param {string} msg the message.
 */
error.Database = function (msg) {
  error.Database.super_.call(this, msg, this.constructor);
  this.name = 'Database Error';
};
util.inherits(error.Database, error.Abstract);

