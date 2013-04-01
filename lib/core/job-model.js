/**
 * @fileoverview The job read/write/update operations using redis.
 *
 */

var _     = require('underscore'),
    when  = require('when'),
    sequence = require('when/sequence');

var kconfig   = require('../utility/config'),
    kickRedis = require('../utility/kredis'),
    kerror    = require('../utility/kerror');

/**
 * Create a new job Class.
 *
 * @param {} [varname] [description]
 * @constructor
 */
var JobModel = module.exports = function( jobItem ) {

  /** @type {redis.CreateClient} redis client */
  this.client = kickRedis.client();

  /** @type {when.Deferred} The deferred to resolve when save completes */
  this.defer = when.defer();

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
    if (err) return def.reject( new kerror.Database(err) );

    this.job.id = id;

    sequence([this._update, this._checkState]).then(def.resolve, def.reject);

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
    return def.reject(new kerror.JSON(ex));
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
      return def.reject(new kerror.Database(err));
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

