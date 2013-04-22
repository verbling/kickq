/**
 * @fileoverview A thin interface for the redis client
 */

var redis = require('redis');
var _ = require('underscore');
var log = require('logg').getLogger('kickq.utils.kRedis');

var kconfig = require('./config');

var kRedis = module.exports = {};

var persistentClient = null;
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
  log.fine('client() :: Init. new: ' + !!optNew);

  if (!optNew && !_.isNull(persistentClient)) {
    return persistentClient;
  }

  var port = kconfig.get('redisPort');
  var host = kconfig.get('redisHost');
  var pass = kconfig.get('redisPassword');
  var opts = kconfig.get('redisOptions');
  var client;
  try {
    client = redis.createClient(port, host, opts);
  } catch(ex) {
    log.error('client() :: Failed to create redis connection. Err: ', ex);
    return null;
  }

  if ( _.isString( pass ) ) {
    client.auth( pass );
  }

  if (!optNew) {
    persistentClient = client;
  }

  log.fine('client() :: Attaching error listener...');
  client.on('error', kRedis._onRedisError);

  clients.push(client);

  return client;
};

/**
 * Handle redis errors so exception will not bubble up.
 *
 * @param  {string} err the error message
 * @protected
 */
kRedis._onRedisError = function(err) {
  log.finer('_onRedisError() :: ', err.message);
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
  persistentClient =persistentClientSub = null;
};

