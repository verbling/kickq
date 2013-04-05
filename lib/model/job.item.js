/**
 * @fileoverview A job item.
 */
var _ = require('underscore');

var Queue = require('./queue.model');
var kconfig = require('../utility/config');

/**
 * The Job object
 *
 * @param {Object=} optJobItem optionally define a job item object
 *                             as returned by the database to fill up
 *                             this instance values.
 * @constructor
 */
var JobItem = module.exports = function(optJobItem) {

  /** @type {?string} the job id. */
  this.id = null;

  /** @type {string} the job name. */
  this.name = 'job name';

  /** @type {boolean} irrespective of success / fail. */
  this.complete = false;

  /** @type {boolean} turns true when complete and executed with success. */
  this.success = false;

  /** @type {number} JS timestamp. */
  this.createTime = Date.now();

  /** @type {number} JS timestamp. */
  this.updateTime = this.createTime;

  /** @type {?number} JS timestamp or null. */
  this.finishTime = null;

  /** @type {?number} total process time in ms or null. */
  this.totalProcessTime = null;

  /** @type {?number} If this job will get delayed before it's queued. */
  this.delay = null;

  /** @type {boolean} If this job will retry. */
  this.retry = false;

  /** @type {number} How many times to retry. */
  this.retryTimes = 3;

  /** @type {number} seconds of interval between retrying. */
  this.retryInterval = 1800;

  /** @type {boolean} */
  this.hotjob = false;

  /** @type {number} seconds. */
  this.hotjobTimeout = 10;

  /** @type {boolean} Enable retrying ghost jobs */
  this.ghostRetry = true;

  /** @type {number} How many times to retry a ghost job */
  this.ghostTimes = 1;

  /** @type {number} seconds of interval between retrying */
  this.ghostInterval = 1800;

  /** @type {*} Any type, passed data on job creation. */
  this.data = null;

  /** @type {?string} Last processing error as defined by consumer  */
  this.lastError = null;


  /**
   *
   * the state can be one of:
   *   - new
   *   - delayed
   *   - processing
   *   - retry
   *   - ghost   :: A re-process state when callback does not report.
   *   - success :: 'complete' flag is true
   *   - fail    :: 'complete' flag is true
   *
   * @type {Kickq.Queue.states}
   */
  this.state = Queue.states.NEW;

  /**
   * Processing runs performed for this job. Can be 1 up to n retries.
   *
   * When the job is new this is an empty array.
   *
   * @type {Array.<JobItem.ProcessItem>} An array of process items.
   */
  this.runs = [];


  //
  //
  // Private variables
  //
  //

  /** @type {boolean} If item has initialized */
  this._hasInitialized = false;


};

/**
 * Initialize values for this job item using options provided or
 * falling back to config.
 *
 * @param  {Object} options Job Options object as passed by the consumer.
 */
JobItem.initialize = function( options ) {
  if (this._hasInitialized) {
    return;
  }
  this._hasInitialized = true;

  // Define all the options that needs to be examined
  var optsExamine = [
    'delay',
    'retry',
    'retryTimes',
    'retryInterval',
    'ghostRetry',
    'ghostTimes',
    'ghostInterval',
    'hotjob',
    'hotjobTimeout',
    'processTimeout'
  ];

  // Get "per job" specific config options
  var configOpts = kconfig.getJob(this.name);

  // examine existence and assign to job.
  optsExamine.forEach(function(prop){

    // defense
    if (!this.hasOwnProperty(prop)) {
      return;
    }

    // check consumer options
    if ( options.hasOwnProperty(prop) ) {
      this[prop] = this.opts[prop];
      return; //next
    }

    // check config options
    if ( configOpts.hasOwnProperty(prop) ) {
      this[prop] = configOpts[prop];
    }
  }, this);
};

/**
 * A processing item, contains information for each processing of a job.
 *
 * @param {Kickq.JobItem} job A job item instance.
 * @constructor
 */
JobItem.ProcessItem = function(job) {

  if (!job instanceof JobItem) {
    throw new TypeError('argument not instance of Kickq.JotItem');
  }

  /** @type {number} the process count of this process item. */
  this.count = 1 + job.runs.length;

  /** @type {number} JS timestamp. */
  this.startTime = Date.now();

  /** @type {?number} Processing time in ms or null. */
  this.processTime = null;

  /**
   * One of these states:
   *   - processing
   *   - ghost   :: A re-process state when callback does not report.
   *   - success :: 'complete' flag is true
   *   - fail    :: 'complete' flag is true
   *
   * @type {Kickq.Queue.processStates}
   */
  this.state = Queue.processStates.PROCESSING;

  /** @type {?string} if failed the consumer provided error message */
  this.errorMessage = null;

  /** @type {?number} setTimeout index */
  this.timeout = null;
};

/**
 * Return a public job item for API consumption.
 *
 * @return {Object}
 */
JobItem.prototype.getPublic = function() {
  var publicItem = Object.create(null);
  _.forEach(this, function(item, key){
    if (_.isFunction(item)) {
      return;
    }

    // check for private
    if ('_' === key.substr(0,1)) {
      return;
    }

    publicItem[key] = item;
  });

  return publicItem;
};

/**
 * Serialize the public object. This method will guarantee a returned JSON
 * value, if standard JSON stringify fails a custom minimum object
 * will be serialized instead.
 *
 * @return {!string} Always string no errors thrown.
 */
JobItem.prototype.getPublicJSON = function() {
  var serialized;
  try {
    serialized = JSON.stringify(this.getPublic());
  } catch(ex) {
    // create minimum viable object
    serialized = '{' +
      '"id":"' + this.id + '"' +
      '}';
  }
  return serialized;
};

/**
 * Add a process item to the current job.
 *
 * @param {Kickq.JobItem.ProcessItem} processItem The process item to add.
 */
JobItem.prototype.addProcessItem = function( processItem ) {

  if (!processItem instanceof JobItem.ProcessItem) {
    throw new TypeError('argument not of type Kickq.JobItem.ProcessItem');
  }

  this.runs.push(processItem);
};