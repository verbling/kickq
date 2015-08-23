/**
 * @fileoverview Handle hotjobs.
 *
 */
var Promise  = require('bluebird');
var log = require('logg').getLogger('kickq.model.Hotjob');

var Model = require('./model');
var states = require('./states');
var kError = require('../utility/kerror');
var channels = require('./channels');
var kRedis = require('../utility/kredis');


/**
 * The hotjob Class.
 *
 * @param {Kickq.JobItem} jobItem the job item.
 * @constructor
 * @extends {Kickq.Model}
 */
var Hotjob = module.exports = Model.extend(function( jobItem ) {
  log.finer('Ctor() :: Init');

  /** @type {?redis.CreateClient} redis client to use for pubsub */
  this.clientSub = null;

  /** @type {Kickq.JobItem} */
  this.job = jobItem;

  /** @type {?string} the redis subscribe key */
  this.subKeySuccess = null;
  /** @type {?string} the redis subscribe key */
  this.subKeyFail = null;

  /** @type {?number} The timeout index */
  this._timeout = null;

  /** @type {boolean} hotjob complete */
  this._isComplete = false;

  /** @type {Promise.Deferred} The deferred hotjob item */
  this.def = Promise.defer();
});

/**
 * Check if this is a hotjob and blow it out of the water.
 *
 * @return {Promise} A promise.
 */
Hotjob.prototype.check = Promise.method(function() {
  if ( !this.job.hotjob || this.job.state !== states.Job.NEW) {
    return;
  }

  // it is a hotjob, get the keys to subscribe to
  this.subKeySuccess = channels.getKey(channels.Channels.SUCCESS, this.job.name);
  this.subKeyFail = channels.getKey(channels.Channels.FAIL, this.job.name);

  this.clientSub = kRedis.client(true);
  this.clientSub.on('message', this._onMessage.bind(this));
  this.clientSub.subscribe(this.subKeySuccess);
  this.clientSub.subscribe(this.subKeyFail);

  // setup the timeout.
  this._timeout = setTimeout(this._complete.bind(this, new kError.Timeout()),
    this.job.hotjobTimeout);

  // notify job item instance
  this.job.setHotjobPromise(this.def.promise);
});

/**
 * Triggers on redis publishing a message on a channel we are subscribed to.
 *
 * @param {string} channel the channel.
 * @param {string} message The message
 * @private
 */
Hotjob.prototype._onMessage = function(channel, message) {
  var publicJobItem;

  // ensure the channels concerns us
  var listenTo = [this.subKeySuccess, this.subKeyFail];
  if ( -1 === listenTo.indexOf(channel)) {
    return;
  }

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

  // check if processing failed or not
  if (this.subKeyFail === channel) {
    this._complete(publicJobItem.lastError);
  } else {
    this._complete(null, publicJobItem);
  }
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
  if (this._isComplete) {
    return;
  }
  this._isComplete = true;

  clearTimeout(this._timeout);
  this._timeout = null;
  this.clientSub.unsubscribe(this.subKeySuccess);
  this.clientSub.unsubscribe(this.subKeyFail);
  this.clientSub.end();
  this.clientSub = null;
  if (err) {
    this.def.reject(err);
  } else {
    this.def.resolve(publicJobItem);
  }
};
