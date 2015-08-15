/**
 * @fileoverview Pops jobs from the to process queues,
 *               essentialy implementing an atomic shift.
 */
var util = require('util');

var Promise = require('bluebird');
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
var PopModel = module.exports = Model.extend(function() {
  log.finer('Ctor() :: Init');

  // fetch is blocking the connection, request a brand new one
  this.clientBlocking = kRedis.client(true);

  /** @type {boolean} if instance has been disposed */
  this._disposed = false;
});

/**
 * Perform fetch operation.
 *
 * @param {Array.<string>} jobNames Array of job names.
 * @return {Promise} a promise.
 */
PopModel.prototype.fetch = Promise.method(function(jobNames) {
  log.finest('fetch() :: Init. jobNames: ' + util.inspect(jobNames));

  if (!Array.isArray(jobNames)) {
    throw new TypeError('argument not an Array');
  }

  var blpopArgs = [];
  jobNames.forEach(function(jobName){
    blpopArgs.push(this.NS + ':queue:' + jobName);
  }, this);

  // set the timeout
  blpopArgs.push(kconfig.get('fetchTimeout'));

  var self = this;
  return new Promise(function(resolve, reject) {
    // set the callback
    blpopArgs.push(self._onResponse.bind(self, resolve, reject));

    // go
    self.clientBlocking.blpop.apply(self.clientBlocking, blpopArgs);
  });

});

/**
 * blpop response.
 *
 * @param {Function} resolve the promise resolve.
 * @param {Function} reject the promise reject.
 * @param {?string} err Error message.
 * @param {?Array} response response from db.
 * @private
 */
PopModel.prototype._onResponse = function(resolve, reject, err, response) {
  log.finer('_onResponse() :: Init. err: ', err);
  if (this._disposed) {
    return;
  }
  if (err) {
    log.db('_onResponse() :: "blpop" Failed! err: ', err);
    reject(new kError.Database(err));
    return;
  }

  if (!Array.isArray(response)) {
    reject(new kError.Timeout('fetch timeout exceeded'));
    return;
  }

  var jobId = response[1];
  var jobModel = new JobModel(jobId);

  jobModel.fetch()
    .then(this._onJobItemFetch.bind(this, resolve, reject))
    .then(jobModel.dispose.bind(jobModel))
    .catch(reject);
};

/**
 * When jobItem has been fetched, update state and resolve.
 *
 * @param {Function} resolve the promise resolve.
 * @param {Function} reject the promise reject.
 * @param {Kickq.JobItem} jobItem  the job item
 * @private
 */
PopModel.prototype._onJobItemFetch = function(resolve, reject, jobItem) {
  log.fine('_onJobItemFetch() :: Init. jobId, state, Queue: ', jobItem.id,
    jobItem.state, jobItem.name);

  jobItem.setState(states.Job.PROCESSING)
    .return(jobItem)
    .then(resolve)
    .catch(reject);
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
