/**
 * @fileOverview A class mixing Model and EventEmitter.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var _ = require('underscore');

var Model = require('./model');

/**
 * Extends both the Model base class and EventEmitter.
 *
 * @constructor
 * @extends {Kickq.Model}
 */
var EventModel = module.exports = function() {
  Model.call(this);
  EventEmitter.call(this);
};
util.inherits(EventModel, Model);
_.extend(EventModel.prototype, EventEmitter.prototype);
