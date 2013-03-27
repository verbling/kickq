/**
 * @fileoverview Configuration module for kickq
 *
 */

var _ = require('underscore');

var config = module.exports = {};

/**
 * Default config values.
 * @const {Object}
 */
var DEFAULT = {
  redisNamespace: 'Kickq',
  processTimeout: 600,
  delay: null,
  ghostRetry: true,
  ghostCount: 1,
  ghostInterval: 1800,
  tombstone: false,
  tombstoneTimeout: 10,
  retry: false,
  retryCount: 3,
  retryInterval: 1800,
  jobFlags: {},
  redisPort: 6389,
  redisHost: '127.0.0.1',
  redisPassword: null,
  redisOptions: null
};

var map = {};

/**
 * Define values for the config
 *
 * @param {Object|string} confObj Config object or config key.
 * @param {*=} optValue value of config if confObj is string.
 */
config.set = function(confObj, optValue) {
  if ( _.isObject(confObj) ) {
    _.extend(map, confObj);
    return;
  }

  if ( _.isString(confObj) ) {
    map[confObj] = optValue;
    return;
  }

  throw new TypeError('Argument not of type Object or String');
};



config.get = function(key) {
  if (map.hasOwnProperty(key)) {
    return map[key];
  }

  return DEFAULT[key];
};
