/**
 * @fileoverview Handles proper queueing of the jobs,
 *   publishing events to redis channels.
 *
 */

var _ = require('underscore');
var when = require('when');
var util = require('util');
var sequence = require('when/sequence');

var Model = require('./model');
var kconfig = require('../utility/config');
var Hotjob = require('./hotjob.model');
var kError = require('../utility/kerror');
var states = require('./states');

/**
 * The State Class.
 *
 * @param {Kickq.JobItem} jobItem the job item.
 * @constructor
 */
var QueueModel = module.exports = function( jobItem ) {

  Model.apply(this, arguments);

  /** @type {Kickq.JobItem} */
  this.job = jobItem;

};
util.inherits(QueueModel, Model);

/**
 * Add the job to the right queue, optionally emitting a publish redis event.
 *
 * @return {when.Promise} A promise.
 */
QueueModel.prototype.save = function() {
  var def = when.defer();

  switch(this.job.state) {
  case states.Job.NEW:
    sequence([

      // new jobs get added to process queue and check for hotjob option.
      this.addToProcessQueue.bind(this),
      this.checkHotjob.bind(this)

    ]).then(def.resolve, def.reject);
    break;
  case states.Job.PROCESSING:
    // nothing todo here
    def.resolve();
    break;
  case states.Job.DELAYED:
  case states.Job.RETRY:
  case states.Job.GHOST:
    if (states.Job.DELAYED !== this.job.state) {
      this._publish('fail');
    }
    // schedule
    var prom = this.schedule();
    when( prom ).then(def.resolve, def.reject);
    break;
  case states.Job.SUCCESS:
  case states.Job.FAIL:

    if (states.Job.SUCCESS === this.job.state) {
      // emit complete event
      this._publish('complete');
    } else {
      this._publish('fail');
    }

    // nuke schedule
    when( this.purgeSchedule().bind(this) ).then(def.resolve, def.reject);
    break;

  default:
    def.reject(new kError.InvalidState(this.job));
    break;
  }

  return def.promise;
};

/**
 * Add the job to the process queue, emit a publish event on redis.
 *
 * @return {when.Promise} A promise.
 */
QueueModel.prototype.addToProcessQueue = function() {
  var def = when.defer();

  // kickq:queue:[ job name ]
  var queueKey = this.NS + ':queue:' + this.job.name;

  this.client.rpush( queueKey, this.job.id, function(err) {
    if (err) {
      var p = def.reject(new kError.QueueFail(this.job, err + ''));
      return p;
    }

    // shout out to my big b and iron ziz!
    this.client.publish( queueKey, this.job.id );

    return def.resolve();
  }.bind(this));

  return def.promise;
};

/**
 * Check if the job has the hotjob flag on and handle it.
 *
 * @return {when.Promise} A promise.
 */
QueueModel.prototype.checkHotjob = function() {
  var hotjob = new Hotjob(this.job);
  return hotjob.check();
};

/**
 * Schedule the job.
 *
 * @return {when.Promise} A promise.
 */
QueueModel.prototype.schedule = function() {

  // figure out when this job should move back to the process queue
  var delay;
  switch(this.job.state) {
  case states.Job.DELAYED:
    delay = this.job.delay * 1000 >>> 0;
    break;
  case states.Job.RETRY:
    delay = this.job.retryInterval * 1000 >>> 0;
    break;
  case states.Job.GHOST:
    delay = kconfig.get('ghostInterval') * 1000 >>> 0;
    break;
  }

  return this._scheduleRedis('scheduled', delay);
};

/**
 * Schedule the job to get purged.
 *
 * @return {when.Promise} A promise.
 */
QueueModel.prototype.purgeSchedule = function() {
  var delay = kconfig.get('purgeTimeout') * 1000;

  return this._scheduleRedis('scheduled-purge', delay);
};



/**
 * Create the actual scheduling record in redis.
 *
 * @param {string} queue The queue, one of 'scheduled', 'scheduled-purge'.
 * @param {number} delay delay in miliseconds.
 * @return {when.Promise} A promise.
 * @private
 */
QueueModel.prototype._scheduleRedis = function(queue, delay) {
  var def = when.defer();

  // save any bloopers with a 5' scheduling
  if (!_.isNumber(delay)) {
    delay = 300000;
  }
  var scheduleFor = Date.now() + delay;

  this.client.zset(this.NS + ':' + queue, scheduleFor, this.job.id, function(err) {

    if (err) {
      return def.reject(new kError.Database(err));
    }
    def.resolve();
  }.bind(this));

  return def.promise;
};

/**
 * Publish a redis message
 *
 * @param  {string} publishType 'complete' or 'fail'.
 * @private
 */
QueueModel.prototype._publish = function(publishType) {

  var publishKey = this.NS + ':' + publishType + ':' + this.job.name;
  var jobSerialized = this.job.getPublicJSON();
  this.client.publish( publishKey, jobSerialized );
};
