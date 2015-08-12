/**
 * @fileoverview The parent model class, only extend, don't call directly.
 */
var cip = require('cip');

var kRedis = require('../utility/kredis');
var kconfig   = require('../utility/config');

var noop = function(){};

var Model = module.exports = cip.extend(function() {
  /** @type {?redis.CreateClient} redis client */
  var client = null;

  // initialize only when requested
  /* jshint camelcase: false */
  this.__defineGetter__('client', function(){
    if (client) {return client;}
    client = kRedis.client();
    return client;
  });

  // ignore set
  this.__defineSetter__('client', noop);
  /** @type {string} The base namespace to use for storing to redis */
  this.NS = kconfig.get('redisNamespace');

});

Model.prototype.dispose = noop;
