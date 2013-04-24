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
var utils = require('../utility/utilities');

/**
 * The Metrics Model Class.
 *
 * @constructor
 * @extends {Kickq.EventModel}
 */
var Metrics = module.exports = function() {
  log.fine('Ctor() :: Init');
  EventModel.call(this);

  /** @type {?redis.CreateClient} redis client to use for pubsub */
  this.clientSub = null;

  this._isOn = false;

  /**
   * Channels this model subscribes to, also doubles as the events emitted.
   * @type {Array.<kickq.Channels>}
   * @private
   */
  this.channels = [
    channels.getKey(channels.Channels.CREATE),
    channels.getKey(channels.Channels.QUEUED),
    channels.getKey(channels.Channels.SUCCESS),
    channels.getKey(channels.Channels.FAIL)
  ];

};
util.inherits(Metrics, EventModel);
utils.addSingletonGetter(Metrics);

/**
 * Subscribe to channels and emit events.
 *
 */
Metrics.prototype.start = function() {
  log.fine('start() :: Init. _isOn: this._isOn');
  if (this._isOn) {return;}
  this._isOn = true;

  this.clientSub = kRedis.client(true);
  this.clientSub.on('message', this._onMessage.bind(this));
  this.channels.forEach(this.clientSub.subscribe.bind(this.clientSub));
};

/**
 * Unsubscribe from channels.
 *
 */
Metrics.prototype.stop = function() {
  log.fine('stop() :: Init. _isOn: ', this._isOn);
  if (!this._isOn) {return;}
  this._isOn = false;
  this.clientSub.removeListener('message', this._onMessage.bind(this));
  this.channels.forEach(this.clientSub.unsubscribe.bind(this.clientSub));

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
  log.fine('_onMessage() :: Init. _isOn, channel: ', this._isOn, channel);
  if (!this._isOn) {return;}

  // ensure this message is for us
  if ( -1 === this.channels.indexOf(channel)) {
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

  // figure out which event to emit based on channel
  var eventType;
  switch(this.channels.indexOf(channel)) {
  case 0:
    eventType = 'create';
    break;
  case 1:
    eventType = 'queued';
    break;
  case 2:
    eventType = 'success';
    break;
  case 3:
    eventType = 'fail';
    break;
  }

  // channel names and events emitted have identical values.
  this.emit(eventType, eventType, publicJobItem);
};
