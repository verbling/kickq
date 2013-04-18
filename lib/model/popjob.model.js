/**
 * @fileoverview Pops jobs from the to process queues,
 *               essentialy implementing an atomic shift.
 */

var util = require('util');
var when = require('when');
var log = require('logg').getLogger('kickq.model.PopModel');

var Model = require('./model');
var kconfig = require('../utility/config');
var kError = require('../utility/kerror');
var JobModel = require('./job.model');
var states = require('./states');
var kRedis = require('../utility/kredis');

/**
 * Fetching jobs from the db.
 *
 * @constructor
 * @extends {Kickq.Model}
 */
var PopModel = module.exports = function() {
  Model.call(this);

  // fetch is blocking the connection, request a brand new one
  this.clientBlocking = kRedis.client(true);

  /** @type {boolean} if instance has been disposed */
  this._disposed = false;

};
util.inherits(PopModel, Model);

/**
 * Perform fetch operation.
 *
 * @param {Array.<string>} jobNames Array of job names.
 * @return {when.Promise} a promise.
 */
PopModel.prototype.fetch = function(jobNames) {
  log.info('fetch() :: Init. jobNames: ' + util.inspect(jobNames));

  var def = when.defer();

  if (!Array.isArray(jobNames)) {
    throw new TypeError('argument not an Array');
  }

  var blpopArgs = [];
  jobNames.forEach(function(jobName){
    blpopArgs.push(this.NS + ':queue:' + jobName);
  }.bind(this));

  // set the timeout
  blpopArgs.push(kconfig.get('fetchTimeout'));

  // set the callback
  blpopArgs.push(this._onResponse.bind(this, def.resolver));
  // go
  this.clientBlocking.blpop.apply(this.clientBlocking, blpopArgs);

  return def.promise;
};

/**
 * blpop response.
 *
 * @param {when.Resolver} resolver the promise resolver.
 * @param {?string} err Error message.
 * @param {?Array} response response from db.
 * @private
 */
PopModel.prototype._onResponse = function(resolver, err, response) {
  log.fine('_onResponse() :: Init. err: ', err);
  if (this._disposed) {
    return;
  }
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

  jobModel.fetch()
    .then(this._onJobItemFetch.bind(this, resolver), resolver.reject)
    .then(jobModel.dispose.bind(jobModel), resolver.reject);
};

/**
 * When jobItem has been fetched, update state and resolve.
 *
 * @param {when.Resolver} resolver the promise resolver.
 * @param {Kickq.JobItem} jobItem  the job item
 * @private
 */
PopModel.prototype._onJobItemFetch = function(resolver, jobItem) {
  log.fine('_onJobItemFetch() :: Init. jobId: ', jobItem.id);

  jobItem.setState(states.Job.PROCESSING).then(function(){
    resolver.resolve(jobItem);
  }, resolver.reject);
};

/**
 * Dispose current instance, references, timeouts, everything.
 *
 * Instance becomes unusable after this method is invoked.
 */
PopModel.prototype.dispose = function() {
  // cut the oxygen
  this.fetch = function(){};

  this.clientBlocking.end();
  this.clientBlocking = null;
  this._disposed = true;
};
