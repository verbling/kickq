/**
 * @fileoverview Vitals model, will subscribe and listen for events that
 *               concern the system vitals.
 */

var util = require('util');
var log = require('logg').getLogger('kickq.model.Vitals');

var EventModel = require('./event-model');

/**
 * Will subscribe and listen for events that concern the system vitals.
 *
 * @constructor
 * @extends {Kickq.EventModel}
 */
var Vitals = module.exports = function() {
  EventModel.call(this);

  this._isOn = false;
};
util.inherits(Vitals, EventModel);


/**
 * Subscribe to channels and emit events.
 *
 */
Vitals.prototype.start = function() {
  if (this._isOn) {return;}
  this._isOn = true;

  this.clientSub.on('message', this._onMessage.bind(this));

  this._channels.forEach(this.clientSub.subscribe.bind(this));
};

/**
 * Unsubscribe from channels.
 *
 */
Vitals.prototype.stop = function() {
  if (!this._isOn) {return;}
  this._isOn = false;

  this._channels.forEach(this.clientSub.unsubscribe.bind(this));
};

/**
 * Triggers on redis publishing a message on a channel we are subscribed to.
 *
 * @param {string} channel the channel.
 * @param {string} message The message.
 * @private
 */
Vitals.prototype._onMessage = function(channel, message) {
  if (!this._isOn) {return;}

  // ensure this message is for us
  if ( -1 === this._channels.indexOf(channel)) {
    return;
  }

  // get jobItem from JSON
  var jobItem;
  try {
    jobItem = JSON.parse(message);
  } catch(ex) {
    log.warn('_onMessage() :: Channel: ' + channel + ' published a message that' +
      'failed to JSON.parse message, exception: ', message, ex);
    return;
  }

  // channel names and events emitted have identical values.
  this.emit(channel, jobItem);
};
