/**
 * @fileoverview Configuration module for kickq
 *
 */
var EventEmitter = require('events').EventEmitter;
var Map = require('collections/map');
var _ = require('underscore');
var logg = require('logg');

var config = module.exports = new EventEmitter();

config.setMaxListeners(30);

/**
 * Default config values.
 * @const {Object}
 */
var DEFAULT = {
  redisNamespace: 'kickq',
  debug: false,
  processTimeout: 10000, // seconds
  delay: null,
  ghostRetry: true,
  ghostCount: 1,
  ghostInterval: 1800000,
  hotjob: false,
  hotjobTimeout: 10000,
  retry: false,
  retryCount: 3,
  retryInterval: 1800000,
  jobFlags: {},
  redisPort: 6379,
  redisHost: '127.0.0.1',
  redisPassword: null,
  redisOptions: null,
  purgeTimeout: 86400000,

  // Scheduler options
  schedulerOn: true,
  schedulerInterval: 1000, // ms
  schedulerFuzz: 300, // ms
  schedulerLookAhead: 1500, // ms

  // Logger options
  loggerConsole: false,
  loggerLevel: logg.Level.WARN,
  loggerSyslog: true,
  loggerSyslogLevel: logg.Level.WARN,
  loggerFile: false,
  loggerFileLevel: logg.Level.WARN,
  loggerFilename: process.cwd() + '/log/kickq.log',

  // More advanced options
  fetchTimeout: 0, // seconds, 0 for ever
  guardInterval: 30000, // ms, how often the guard checks the worker default 30".

  // metrics
  vitalsInterval: 300000 // ms, Vitals setInterval period, default 5'.
};

var map = new Map(DEFAULT);

// listen for changes and emit event
map.addMapChangeListener(function(value, key){
  config.emit(key, key, value);
});

/**
 * Define values for the config
 *
 * @param {Object|string} confObj Config object or config key.
 * @param {*=} optValue value of config if confObj is string.
 */
config.set = function(confObj, optValue) {
  if ( _.isObject(confObj) ) {
    map.addEach(confObj);
    return;
  }

  if ( _.isString(confObj) ) {
    map.set(confObj, optValue);
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
  return map.get(key);
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

/**
 * Reset the config to its original state, remove all listeners.
 *
 */
config.reset = function() {
  map.clear();
  map.addEach(DEFAULT);
};
