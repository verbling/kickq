/**
 * @fileoverview Metrics model, will subscribe and listen for measurable events.
 */

var util = require('util');
var logg = require('logg');
var log = logg.getLogger('kickq.model.Metrics');

var EventModel = require('./event-model');
// var states = require('./states');
var channels = require('./channels');
var kRedis = require('../utility/kredis');

/**
 * The Metrics Model Class.
 *
 * @constructor
 * @extends {Kickq.EventModel}
 */
var Metrics = module.exports = function() {
  log.fine('ctor() :: Init');
  EventModel.call(this);

  /** @type {?redis.CreateClient} redis client to use for pubsub */
  this.clientSub = null;

  this._isOn = false;

  /**
   * Channels this model subscribes to, also doubles as the events emitted.
   * @type {Array.<kickq.Channels>}
   * @private
   */
  this._channels = [
    channels.Channels.CREATE,
    channels.Channels.QUEUED,
    channels.Channels.SUCCESS,
    channels.Channels.FAIL
  ];
};
util.inherits(Metrics, EventModel);

/**
 * Static function that returns a singleton instance.
 *
 * @return {kickq.MetricsModel} The Metrics Model.
 */
Metrics.getSingleton = function() {
  if (Metrics._instance) {
    return Metrics._instance;
  }

  Metrics._instance = new Metrics();
  return Metrics._instance;
};

/**
 * Subscribe to channels and emit events.
 *
 */
Metrics.prototype.start = function() {
  if (this._isOn) {return;}
  this._isOn = true;

  this.clientSub = kRedis.client(true);
  this.clientSub.on('message', this._onMessage.bind(this));
  this._channels.forEach(this.clientSub.subscribe.bind(this));
};

/**
 * Unsubscribe from channels.
 *
 */
Metrics.prototype.stop = function() {
  if (!this._isOn) {return;}
  this._isOn = false;
  this.clientSub.removeListener('message', this._onMessage.bind(this));
  this._channels.forEach(this.clientSub.unsubscribe.bind(this));

  this.clientSub.end();
  this.clientSub = null;
};

/**
 * Triggers on redis publishing a message on a channel we are subscribed to.
 *
 * @param {string} channel the channel.
 * @param {string} message The message.
 * @private
 */
Metrics.prototype._onMessage = function(channel, message) {
  if (!this._isOn) {return;}

  // ensure this message is for us
  if ( -1 === this._channels.indexOf(channel)) {
    return;
  }

  // get jobItem from JSON
  var publicJobItem;
  try {
    publicJobItem = JSON.parse(message);
  } catch(ex) {
    log.warn('_onMessage() :: Channel: ' + channel + ' published a message that' +
      'failed to JSON.parse message, exception: ', message, ex);
    return;
  }

  // channel names and events emitted have identical values.
  this.emit(channel, publicJobItem);
};
