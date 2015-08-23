/**
 * @fileOverview A class mixing Model and EventEmitter.
 */
var EventEmitter = require('events').EventEmitter;

var cip = require('cip');

var CeventEmitter = cip.cast(EventEmitter);

var Model = require('./model');

/**
 * Extends both the Model base class and EventEmitter.
 *
 * @constructor
 * @extends {Kickq.Model}
 */
var EventModel = module.exports = CeventEmitter.extend();
EventModel.mixin(Model);
