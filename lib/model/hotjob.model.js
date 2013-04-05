/**
 * @fileoverview Handle hotjobs.
 *
 */

var util = require('util');
var when  = require('when');

var Model = require('./model');
var Kickq = require('../kickq.main');
var Queue = Kickq.Queue;
var kError = require('../utility/kerror');

/**
 * The hotjob Class.
 *
 * @param {Kickq.JobItem} jobItem the job item.
 * @constructor
 * @extends {Kickq.Model}
 */
var Hotjob = module.exports = function( jobItem ) {

  Model.call(this);

  /** @type {when.Deferred} The deferred */
  this.def = when.defer();

  /** @type {Kickq.JobItem} */
  this.job = jobItem;

  /** @type {?string} the redis subscribe key */
  this.subKey = null;

  /** @type {?number} The timeout index */
  this._timeout = null;

  /** @type {boolean} hotjob complete */
  this._complete = false;
};
util.inherits(Hotjob, Model);

/**
 * Check if this is a hotjob and blow it out of the water.
 *
 * @return {when.Promise} A promise.
 */
Hotjob.prototype.check = function() {

  if ( !this.job.hotjob || Queue.states.NEW !== this.job.state) {
    return this.def.resolve();
  }

  this.subKey = this.NS + ':complete:' + this.job.name;

  this.client.on('message', this._onMessage.bind(this));
  this.client.subscribe(this.subKey);

  // setup the timeout, multiply seconds to make them ms.
  this._timeout = setTimeout(this._complete.bind(this, new kError.Timeout()),
    this.job.hotjobTimeout * 1000);

  // always resolves
  return when.resolve();
};

/**
 * Triggers on redis publish.
 *
 * @param  {string} channel the channel.
 * @param  {string} message The message
 * @private
 */
Hotjob.prototype._onMessage = function(channel, message) {
  var publicJobItem;
  try {
    publicJobItem = JSON.parse(message);
  } catch(ex) {
    this._complete(new kError.JSON(ex));
    return;
  }

  // check if this message matches our hotjob job id
  if ( this.job.id !== publicJobItem.id ) {
    return;
  }

  // complete the hotjob.
  this._complete(null, publicJobItem);
};

/**
 * Complete and clean this hotjob
 *
 * @param {Error|null} err Error object or null if done.
 * @param {Object} publicJobItem A publis job item.
 * @private
 */
Hotjob.prototype._complete = function(err, publicJobItem) {
  // defense
  if (this._complete) {
    return;
  }
  this._complete = true;

  clearTimeout(this._timeout);
  this._timeout = null;
  this.client.unsubscribe(this.subKey);
  this.client.quit();

  if (err) {
    this.def.reject(err);
  } else {
    this.def.resolve(publicJobItem);
  }
};
