/**
 * @fileoverview Logging facilities for kickq, logfiles, syslog store.
 */

// Nodejs libs.
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');

var _ = require('underscore');
var logg = require('logg');

var kconfig = require('./config');
var kfile = require('./kfile');

var initialized = false;
var _fileLog = kconfig.get('loggerFile');
var _filename = kconfig.get('loggerFilename');
var _debug = kconfig.get('debug');

var _loggerLevel = kconfig.get('loggerLevel');


var klogger = module.exports = new EventEmitter();


/**
 * Initialize
 */
klogger.init = function() {
  if (initialized) {return;}
  initialized = true;

  klogger._setLevel();

  logg.removeConsole();

  // create custom logging levels
  logg.Level.DATABASE = 900;
  // FIXME dangerous and ugly hack to extend Logger's proto
  var Logger = require('logg/lib/logger');
  Logger.prototype.db = _.partial(Logger.prototype.log, logg.Level.DATABASE);

  klogger.hookOnConfig();
};

/**
 * Triggers when config changes and updates internal values.
 *
 * @param {string} key The key that changed.
 * @param {*} value The new value.
 * @private
 */
klogger._onConfigChange = function(key, value) {
  var action;
  switch(key) {
  case 'loggerConsole':
    action = value ? logg.addConsole : logg.removeConsole;
    action();
    break;
  case 'loggerFile':
    _fileLog = value;
    break;
  case 'loggerFilename':
    _filename = value;
    break;
  case 'debug':
    action = value ? logg.addConsole : logg.removeConsole;
    action();
    _debug = value;
    klogger._setLevel();
    break;
  case 'loggerLevel':
    _loggerLevel = value;
    klogger._setLevel();
    break;
  }
};

/**
 * set the minimum logging level to logg.
 *
 */
klogger._setLevel = function() {
  var level;
  if (_debug) {
    level = logg.Level.FINEST;
  } else {
    level = _loggerLevel;
  }

  var logger = logg.getLogger('kickq');
  logger.setLogLevel(level);
};

/**
 * Handle a captured log event.
 *
 * Sample logRecord object:
 *
 * level: 100
 * name: 'kickq.ctrl.process'
 * rawArgs: [ '_masterLoop() :: Loop: 2 processing: 0 concurrent jobs: 1' ]
 * date: Tue Apr 16 2013 18:29:52 GMT+0300 (EEST)
 * message: '_masterLoop() :: Loop: 2 processing: 0 concurrent jobs: 1' }
 *
 *
 * @param  {Object} logRecord As seen above.
 * @private
 */
klogger._handleLog = function(logRecord) {
  if (_debug || _loggerLevel <= logRecord.level) {
    // relay the record
    klogger.emit('message', logRecord);
  }

  var message = logg.formatRecord(logRecord, true);

  if (_fileLog) {
    if (_debug || _loggerLevel <= logRecord.level) {
      klogger._saveToFile(message);
    }
  }

};

/**
 * Append a log message to the log file.
 *
 * @param  {string} message the message.
 * @private
 */
klogger._saveToFile = function(message) {
  if (!kfile.isFile(_filename)) {
    // try to create it...
    try {
      kfile.write(_filename, '');
    } catch(ex) {
      console.log('\n\n********************\nFailed to write to log file! File: ', _filename, '\n\n');
      return;
    }
  }
  fs.appendFile(_filename, message);
};

/**
 * Hooks to related events on config.
 *
 */
klogger.hookOnConfig = function() {
  // listen for changes on config for the following keys:
  var configEvents = ['loggerConsole', 'loggerDebug', 'loggerSyslog',
    'loggerFile', 'loggerFilename', 'debug', 'loggerLevel',
    ];

  configEvents.forEach(function(ev) {
    kconfig.on(ev, klogger._onConfigChange);
  });
};
