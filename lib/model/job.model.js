/**
 * @fileoverview The job read/write/update operations using redis.
 *
 */

var when  = require('when'),
    sequence = require('when/sequence');

var kconfig   = require('../utility/config'),
    State     = require('./state.model'),
    kRedis = require('../utility/kredis'),
    kError    = require('../utility/kerror');

/**
 * The job Class.
 *
 * @param {Kickq.JobItem} jobItem the job item.
 * @constructor
 */
var JobModel = module.exports = function( jobItem ) {

  /** @type {redis.CreateClient} redis client */
  this.client = kRedis.client();

  /** @type {Kickq.JobItem} */
  this.job = jobItem;

  /** @type {string} The base namespace to use for storing to redis */
  this.NS = kconfig.get('redisNamespace');
};

/**
 * Create or Update a job item, checks if new and gets an id or passes
 * control to the _update() method.
 *
 * @return {when.Promise} a promise.
 */
JobModel.prototype.save = function() {
  var def = when.defer();

  this.client.incr( this.NS + ':id', function(err, id) {
    if (err) return def.reject( new kError.Database(err) );

    this.job.id = id;

    // execute in sequence and resolve or reject the local deferred.
    sequence([
      this._update.bind(this),
      this._checkState.bind(this)
    ]).then(def.resolve, def.reject);

  }.bind(this));

  return def.promise;
};

/**
 * Create or Update a job item.
 *
 * @return {when.Promise} A promise.
 */
JobModel.prototype._update = function() {
  var def = when.defer();

  var key = this.NS + ':job:' + this.job.id;

  this.job.updateTime.updateTime = Date.now();

  var itemDataJson;
  try {
    itemDataJson = JSON.stringify(this.job);
  } catch(ex) {
    return def.reject(new kError.JSON(ex));
  }

  var redisJobItem = {
    id: this.job.id,
    name: this.job.name,
    createTime: this.job.createTime,
    updateTime: this.job.updateTime,
    state: this.job.state,
    itemData: itemDataJson
  };

  this.client.hmset( key, redisJobItem, function(err) {
    if (err) {
      return def.reject(new kError.Database(err));
    }
    def.resolve();
  });

  return def.promise;
};

/**
 * After a job has been saved to redis the state needs to be determined and
 * add the Job Id to the proper queue.
 *
 * @return {when.Promise} a promise.
 */
JobModel.prototype._checkState = function() {
  return new State(this.job).save();
};

/**
 * When a consumer finishes processing a job, flow ends up here,
 * this method will determine the next state of the job and perform
 * the required updates on redis.
 *
 * @param {boolean} success Process outcome.
 * @param {boolean=} optTimeout If processing timed out.
 * @return {when.Promise} a promise.
 */
JobModel.prototype.processed = function(success, optTimeout) {
  // prep job item for save
  this.job.updateTime = Date.now();

  // deal with success first, its easier / most common
  if (success) {
    this.job.complete = true;
    this.job.success = true;
    this.job.finishTime = Date.now();
    // calculate total processing time
    this.job.totalProcessTime = this.job.runs.reduce(
      function(prev, cur){ return prev.processTime + cur.processTime;}
    );
  }
};
