/**
 * @fileoverview Vitals model, will subscribe and listen for events that
 *               concern the system vitals.
 */

var util = require('util');
var log = require('logg').getLogger('kickq.model.Vitals');

var EventModel = require('./event-model');
var kconfig = require('../utility/config');
var MetricsModel = require('../model/metrics.model');

/**
 * Will subscribe and listen for events that concern the system vitals.
 *
 * @constructor
 * @extends {Kickq.EventModel}
 */
var Vitals = module.exports = function() {
  EventModel.call(this);

  this._isOn = false;

  /** @type {number} setInterval period in milliseconds */
  this._period = kconfig.get('vitalsInterval');

  /** @type {Object} setInterval index */
  this._setInterval = null;

  this._metrics = MetricsModel.getInstance();
};
util.inherits(Vitals, EventModel);


/**
 * Subscribe to channels and emit events.
 *
 */
Vitals.prototype.start = function() {
  if (this._isOn) {return;}
  this._isOn = true;


  this._metrics.channels.forEach(this._onMetricEvent.bind(this));
  this._metrics.start();

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
Vitals.prototype._onMetricEvent = function(publicJobItem) {
  if (!this._isOn) {return;}

};
