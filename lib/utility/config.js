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


/**
 * Return the value of a configuration parameter.
 *
 * @param  {string} key The key.
 * @return {*} whatever.
 */
config.get = function(key) {
  if (map.hasOwnProperty(key)) {
    return map[key];
  }

  return DEFAULT[key];
};


/**
 * Helper for geting job specific options that exist in the "jobFlags" Object.
 *
 * @param  {string} jobName The job name.
 * @return {Object} Will always return an object, empty if nothing defined.
 */
config.getJob = function(jobName) {
  var jobFlags = config.get('jobFlags');

  if ( _.isObject(jobFlags[jobName]) ) {
    return jobFlags[jobName];
  }
  return {};
};

