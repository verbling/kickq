/**
 * @fileoverview Vitals model, will subscribe and listen for events that
 *               concern the system vitals.
 */

var util = require('util');

var EventModel = require('./event-model');
var states = require('./states');

/**
 * Will subscribe and listen for events that concern the system vitals.
 *
 * @constructor
 * @extends {Kickq.EventModel}
 */
var Vitals = module.exports = function() {
  EventModel.call(this);

};
util.inherits(Vitals, EventModel);

