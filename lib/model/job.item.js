/**
 * @fileoverview A job item.
 */
var util = require('util');
var _ = require('underscore');
var when = require('when');
var log = require('logg').getLogger('kickq.model.JobItem');

var kconfig = require('../utility/config');
var states = require('./states');
var kError = require('../utility/kerror');
var Model = require('./model');

/**
 * The Job object
 *
 * @param {Object=} optJobItem optionally define a job item object
 *                             as returned by the database to fill up
 *                             this instance values.
 * @constructor
 * @extends {Kickq.Model}
 */
var JobItem = module.exports = function(optJobItem) {
  log.finer('Ctor() :: Init');
  Model.apply(this, arguments);

  /** @type {?string} the job id. */
  this.id = null;

  /** @type {string} the job name. */
  this.name = '';

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

  /** @type {number} ms, 10 seconds to wait for a worker to complete processing. */
  this.processTimeout = 10000;

  /** @type {boolean} If this job will retry. */
  this.retry = false;

  /** @type {number} How many times to retry. */
  this.retryTimes = 3;

  /** @type {number} ms, 30minutes of interval between retrying. */
  this.retryInterval = 1800000;

  /** @type {boolean} */
  this.hotjob = false;

  /** @type {number} ms, 10 seconds. */
  this.hotjobTimeout = 10000;

  /** @type {boolean} Enable retrying ghost jobs */
  this.ghostRetry = true;

  /** @type {number} How many times to retry a ghost job */
  this.ghostTimes = 1;

  /** @type {number} milliseconds of interval between retrying */
  this.ghostInterval = 1800000;

  /** @type {*} Any type, passed data on job creation. */
  this.data = null;

  /** @type {?string} Last processing error as defined by consumer  */
  this.lastError = null;

  /** @type {?number} JS timestamp of when this job has been scheduled for */
  this.scheduledFor = null;

  /**
   *
   * the state can be one of:
   *   - new
   *   - queued :: A job has been queued for re-processing
   *   - delayed
   *   - processing
   *   - retry
   *   - ghost   :: A re-process state when callback does not report.
   *   - success :: 'complete' flag is true
   *   - fail    :: 'complete' flag is true
   *
   * @type {Kickq.states.Job}
   */
  this.state = states.Job.NEW;

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

  /** @type {?when.Promise} The hotjob's promise object is referenced here */
  this._hotjobPromise = null;

  // Check if a jobItem has been passed as argument and use it
  if (_.isObject(optJobItem)) {
    this._useItem(optJobItem);
  }
};
util.inherits(JobItem, Model);

/**
 * Initialize values for a new job item using options provided or
 * falling back to config.
 *
 * @param  {Object=} options Job Options object as passed by the consumer.
 */
JobItem.prototype.initialize = function( options ) {
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
      this[prop] = options[prop];
      return; //next
    }

    // check per job config options
    if ( configOpts.hasOwnProperty(prop) ) {
      this[prop] = configOpts[prop];
      return; // next
    }

    // Finally get global config options
    this[prop] = kconfig.get(prop);
  }, this);

  // determine original state
  if (_.isNumber(this.delay)) {
    this.state = states.Job.DELAYED;
  }
};

/**
 * A processing item, contains information for each processing of a job.
 *
 * @param {Kickq.JobItem} job A job item instance.
 * @constructor
 */
JobItem.ProcessItem = function(job) {

  if (!(job instanceof JobItem)) {
    throw new TypeError('argument not instance of Kickq.JotItem');
  }

  /** @type {number} the process count of this process item. */
  this.count = 1 + job.runs.length;

  /** @type {number} JS timestamp. */
  this.startTime = Date.now();

  /** @type {?number} Processing time in ms or null. */
  this.processTime = null;

  /** @type {?number} Processing timeout in ms for this item */
  this.processTimeout = null;

  /**
   * One of these states:
   *   - processing
   *   - ghost   :: A re-process state when callback does not report.
   *   - success :: 'complete' flag is true
   *   - fail    :: 'complete' flag is true
   *
   * @type {Kickq.states.Process}
   */
  this.state = states.Process.PROCESSING;

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

    // check for special symbols that should not be exposed
    if (0 <= [
        'client',
        'clientSub',
        'NS'
      ].indexOf(key)) {
        return;
      }

    publicItem[key] = item;
  });

  // expose hotjob Promise
  publicItem.hotjobPromise = this._hotjobPromise;
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
    serialized = '{"id":"' + this.id + '"}';
  }
  return serialized;
};

/**
 * Add a process item to the current job.
 *
 * @param {Kickq.JobItem.ProcessItem} processItem The process item to add.
 */
JobItem.prototype.addProcessItem = function( processItem ) {
  if ( !(processItem instanceof JobItem.ProcessItem) ) {
    throw new TypeError('argument not of type Kickq.JobItem.ProcessItem');
  }

  this.runs.push(processItem);
};

/**
 * A job item object has been passed to the constructor, use it.
 *
 * @param  {Object} jobItem The job item as was saved in the db.
 * @private
 */
JobItem.prototype._useItem = function(jobItem) {
  _.keys(jobItem).forEach(function(key){
    this[key] = jobItem[key];
  }.bind(this));
};

/**
 * Set a hotjob promise object to this instance.
 *
 * @param {when.Promise} promise The hotjob promise.
 */
JobItem.prototype.setHotjobPromise = function(promise) {
  this._hotjobPromise = promise;
};

/**
 * Save the job item.
 *
 * @return {when.Promise} A promise.
 */
JobItem.prototype.save = function() {
  log.fine('save() :: Init. jobId, Queue:', this.id, this.name);
  var def = when.defer();

  var key = this._getKey();

  // prep job item for save
  this.updateTime = Date.now();

  var itemDataJson;
  try {
    itemDataJson = this.getPublicJSON();
  } catch(ex) {
    return def.reject(new kError.JSON(ex));
  }

  var redisJobItem = {
    id: this.id,
    name: this.name,
    createTime: this.createTime,
    updateTime: this.updateTime,
    state: this.state,
    itemData: itemDataJson
  };

  this.client.hmset( key, redisJobItem, function(err) {
    if (err) {
      log.db('save() :: "hmset" failed. err: ', err);
      return def.reject(new kError.Database(err));
    }
    def.resolve();
  });

  return def.promise;
};

/**
 * Purge the job.
 *
 * @return {when.Promise} a promise.
 */
JobItem.prototype.delete = function() {
  log.fine('delete() :: Init. jobId:', this.id);
  var def = when.defer();

  this.client.del( this._getKey(), function(err) {
    if (err) {
      log.db('delete() :: "del" failed. err: ', err);
      return def.reject(new kError.Database(err));
    }
    def.resolve();
  });

  return def.promise;
};

/**
 * Change the state of the job item.
 *
 * @return {when.Promise} A promise
 */
JobItem.prototype.setState = function(newState) {
  var def = when.defer();

  if (this.state === newState) {
    return;
  }

  var jobKey = this._getKey();
  var oldSetKey = states.getKey(this.state);
  var newSetKey = states.getKey(newState);

  log.info('setState() :: jobId, oldState, newState, Queue: ', this.id,
    this.state, newState, this.name);

  // perform the move
  this.state = newState;
  this.client.multi()
    .hset(jobKey, 'state', this.state)
    .smove(oldSetKey, newSetKey, this.id)
    .exec(function(err){
      if (err) {
        log.db('setState() :: "hmset/smove/exec" failed. err: ', err);
        return def.reject(new kError.Database(err));
      }
      def.resolve();
    });

  return def.promise;
};

/**
 * Create the state record in redis for a new job.
 *
 * @return {when.Promise} a promise.
 */
JobItem.prototype.createState = function() {
  var def = when.defer();

  var setKey = states.getKey(this.state);
  this.client.sadd(setKey, this.id, function(err) {
    if (err) {
      log.db('createState() :: "sadd" failed. err:', err);
      return def.reject(new kError.Database(err));
    }
    def.resolve();
  });

  return def.promise;
};

/**
 * Get the db key for the current item for job hash.
 *
 * @return {string} the key.
 * @private
 */
JobItem.prototype._getKey = function() {
  return this.NS + ':job:' + this.id;
};
