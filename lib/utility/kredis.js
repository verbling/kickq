/**
 * @fileoverview A thin interface for the redis client
 */

var redis = require('redis'),
    _ = require('underscore');

var kconfig = require('./config');

var kickRedis = module.exports = {};

/**
 * Create a new connection to redis using the configuration values.
 *
 * @return {redis.RedisClient} A redis client.
 */
kickRedis.client = function() {
  var port = kconfig.get('redisPort');
  var host = kconfig.get('redisHost');
  var pass = kconfig.get('redisPassword');
  var opts = kconfig.get('redisOptions');

  var client = redis.createClient(port, host, opts);

  if ( _.isString( pass ) ) {
    client.auth( pass );
  }

  return client;
};
