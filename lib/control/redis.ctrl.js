/**
 * @fileOverview The Redis controller monitors Redis connectivity.
 */

var EventEmitter = require('events').EventEmitter;

var cip = require('cip');

var log = require('logg').getLogger('kickq.ctrl.Redis');

var kRedis = require('../utility/kredis');

var CeventEmitter = cip.cast(EventEmitter);

/**
 * The Redis controller monitors Redis connectivity.
 *
 * @constructor
 * @extends {EventEmitter}
 */
var RedisCtrl = module.exports = CeventEmitter.extendSingleton(function() {
  /** @type {?Redis.Client} Redis client */
  this.client = null;

  /** @type {Boolean} Tracks redis connectivity */
  this.connected = true;

  this._connectHandler = this._handleConnect.bind(this);
  this._errorHandler = this._handleError.bind(this);
});

/**
 * Kick off the redis monitor.
 *
 */
RedisCtrl.prototype.init = function() {
  this.client = kRedis.client();

  this.client.on('connect', this._connectHandler);
  this.client.on('error', this._errorHandler);
};

/**
 * Handle Redis Connect.
 *
 */
RedisCtrl.prototype._handleConnect = function() {
  if (!this.connected) {
    this.connected = true;
    log.fine('_handleConnect() :: Connection to Redis server restored');
    this.emit('connect');
  }
};

/**
 * Handle Redis Error.
 *
 */
RedisCtrl.prototype._handleError = function() {
  if (!this.client.connected && this.connected) {
    this.connected = false;
    log.fine('_handleError() :: Lost connection to Redis server');
    this.emit('disconnect');
  }
};

/**
 * Dispose the listeners.
 *
 */
RedisCtrl.prototype.dispose = function() {
  this.client.removeListener('connect', this._connectHandler);
  this.client.removeListener('error', this._errorHandler);
};
