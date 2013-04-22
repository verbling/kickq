/**
 * @fileoverview Metrics model, will subscribe and listen for measurable events.
 */

var util = require('util');

var EventModel = require('./event-model');
var states = require('./states');

/**
 * The Metrics Model Class.
 *
 * @constructor
 * @extends {Kickq.EventModel}
 */
var Metrics = module.exports = function() {
  EventModel.call(this);

};
util.inherits(Metrics, EventModel);

