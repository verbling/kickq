/**
 * @fileoverview Save log messages to redis.
 */
var util = require('util');

var Model = require('./model');

/**
 * The log model Class.
 *
 * @constructor
 * @extends {Kickq.Model}
 */
var LogModel = module.exports = function() {
  Model.apply(this, arguments);
};
util.inherits(LogModel, Model);

LogModel._instance = null;

// static version of save method, uses singleton
LogModel.save = function(message) {
  if (!LogModel._instance) {
    LogModel._instance = new LogModel();
  }

  LogModel._instance.save(message);

};

/**
 * Store a message to the db.
 *
 * @param  {string} message the message
 * @return {void}
 */
LogModel.prototype.save = function(message) {
  try {
    var key = this.NS + ':log';
    this.client.zadd(key, Date.now(), message);
  } catch(ex) {
    // mute
  }
};
