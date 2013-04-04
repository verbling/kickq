/**
 * @fileoverview Fetching jobs from the db,
 *               essentialy implemeting an atomic shift.
 */

var util = require('util');
var when = require('when');

var Model = require('./model');
var kconfig = require('../utility/config');
var kError = require('../utility/kerror');
var JobModel = require('./job.model');


/**
 * Fetching jobs from the db.
 *
 * @constructor
 * @extends {Kickq.Model}
 */
var FetchModel = module.exports = function() {
  Model.call(this);
};
util.inherits(FetchModel, Model);

/**
 * Perform fetch operation.
 *
 * @param  {Array.<string>} jobNames Array of job names.
 * @return {when.Promise} a promise.
 */
FetchModel.prototype.fetch = function(jobNames) {

  var def = when.defer();

  if (!Array.isArray(jobNames)) {
    throw new TypeError('argument not an Array');
  }

  var blpopArgs = Array.prototype.slice.call(jobNames, 0);

  // set the timeout
  blpopArgs.push(kconfig.get('fetchTimeout'));

  // set the callback
  blpopArgs.push(this._onResponse.bind(this, def.resolver));

  // go
  this.client.blpop.apply(this.client, blpopArgs);

  return def.promise;
};

/**
 * blpop response.
 *
 * @param  {when.Resolver} resolver the promise resolver.
 * @param  {?string} err Error message.
 * @param  {?Array} response response from db.
 * @private
 */
FetchModel.prototype._onResponse = function(resolver, err, response) {

  if (err) {
    resolver.reject(new kError.Database(err));
    return;
  }

  if (!Array.isArray(response)) {
    resolver.reject(new kError.Timeout('fetch timeout exceeded'));
    return;
  }

  var jobId = response[1];
  var jobModel = new JobModel(jobId);

  jobModel.fetch().then(resolver.resolve, resolver.reject);
};
