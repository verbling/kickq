/**
 * @fileoverview A thin interface for the redis client
 */

var redis = require('redis');
var _ = require('underscore');
var log = require('logg').getLogger('kickq.utils.kRedis');

var kconfig = require('./config');

var kRedis = module.exports = {};

var persistentClient = null;
// throttle redis error messages, can be plenty if no connection.
var redisErrorLogThrottler = false;
var clients = [];

/**
 * Creates a persistent connection to redis and provides it.
 *
 * Optionally you can require a new connection from the arguments.
 *
 * @param {boolean=} optNew get a new client.
 * @return {redis.RedisClient} A redis client.
 */
kRedis.client = function(optNew) {
  log.finest('client() :: Init. new: ' + !!optNew);

  if (!optNew && !_.isNull(persistentClient)) {
    return persistentClient;
  }

  var port = kconfig.get('redisPort');
  var host = kconfig.get('redisHost');
  var pass = kconfig.get('redisPassword');
  var opts = kconfig.get('redisOptions');
  var client;

  log.finer('client() :: Creating client using host, port:', host, port);
  try {
    client = redis.createClient(port, host, opts);
  } catch(ex) {
    log.error('client() :: Failed to create redis connection. Err: ', ex);
    return null;
  }

  client.on('error', kRedis._onRedisError.bind(null, clients.length));


  if ( _.isString( pass ) ) {
    client.auth( pass );
  }

  if (!optNew) {
    persistentClient = client;
  }

  clients.push(client);

  return client;
};

/**
 * Handle redis errors so exception will not bubble up.
 *
 * @param {Number} index The Redis client index.
 * @param {string} err the error message
 * @protected
 */
kRedis._onRedisError = function(index, err) {
  if (redisErrorLogThrottler) {
    return;
  } else {
    redisErrorLogThrottler = true;
    log.finest('_onRedisError() :: Client-Index:', index, 'Err:', err.message, err);
    setTimeout(function() {
      redisErrorLogThrottler = false;
    }, 10000);
  }
};

/**
 * Close all connections and reset objects.
 *
 */
kRedis.dispose = function() {
  clients.forEach(function(client){
    client.end();
  });
  clients = [];
  persistentClient = null;
};

