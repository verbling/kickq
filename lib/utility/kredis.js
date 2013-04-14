/**
 * @fileoverview A thin interface for the redis client
 */

var redis = require('redis');
var _ = require('underscore');

var kconfig = require('./config');

var kRedis = module.exports = {};

var persistentClient = null;
var persistentClientSub = null;
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

  if (!optNew && !_.isNull(persistentClient)) {
    return persistentClient;
  }

  var port = kconfig.get('redisPort');
  var host = kconfig.get('redisHost');
  var pass = kconfig.get('redisPassword');
  var opts = kconfig.get('redisOptions');

  var client = redis.createClient(port, host, opts);

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
 * Connections used for publish commands.
 *
 * Creates a persistent connection to redis and provides it.
 *
 * Optionally you can require a new connection from the arguments.
 *
 * @param {boolean=} optNew get a new client.
 * @return {redis.RedisClient} A redis client.
 */
kRedis.clientPublish = function(optNew) {
  if (!optNew && !_.isNull(persistentClientSub)) {
    return persistentClientSub;
  }

  var client = kRedis.client(true);

  if (!optNew) {
    persistentClientSub = client;
  }
  return client;
};

/**
 * Connections used for subscribe commands.
 *
 * Creates a persistent connection to redis and provides it.
 *
 * Optionally you can require a new connection from the arguments.
 *
 * @param {boolean=} optNew get a new client.
 * @return {redis.RedisClient} A redis client.
 */
kRedis.clientSub = function(optNew) {
  if (!optNew && !_.isNull(persistentClientSub)) {
    return persistentClientSub;
  }

  var client = kRedis.client(true);

  if (!optNew) {
    persistentClientSub = client;
  }
  return client;
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

