/**
 * @fileoverview Handles proper queueing of the jobs,
 *   publishing events to redis channels.
 *
 */

var _ = require('underscore');
var when = require('when');
var util = require('util');

var log = require('logg').getLogger('kickq.model.Queue');

var Model = require('./model');
var kconfig = require('../utility/config');
var Hotjob = require('./hotjob.model');
var kError = require('../utility/kerror');
var states = require('./states');
var channels = require('./channels');

/**
 * The State Class.
 *
 * @param {Kickq.JobItem} jobItem the job item.
 * @constructor
 * @extends {Kickq.Model}
 */
var QueueModel = module.exports = function( jobItem ) {
  log.finer('Ctor() :: Init');
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
  log.fine('save() :: Init. jobId, state, Queue: ', this.job.id,
    this.job.state, this.job.name);
  var def = when.defer();

  switch(this.job.state) {
  case states.Job.NEW:
    // new jobs get added to process queue and check for hotjob option.
    this._publish(channels.Channels.CREATE);

    this.addToProcessQueue()
      .then(this.checkHotjob.bind(this), def.reject)
      .then(def.resolve, def.reject);
    break;
  case states.Job.QUEUED:
    this.addToProcessQueue().then(def.resolve, def.reject);
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
    prom.then(def.resolve, def.reject);
    break;
  case states.Job.SUCCESS:
  case states.Job.FAIL:
    function pub() {
      if (states.Job.SUCCESS === this.job.state) {
        // emit complete event
        this._publish(channels.Channels.SUCCESS);
      } else {
        this._publish(channels.Channels.FAIL);
      }

      def.resolve();
    }

    // nuke schedule
    this.purgeSchedule().then(pub.bind(this), def.reject)
      .otherwise(def.reject);
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
      log.db('addToProcessQueue() :: "rpush" Failed! jobId, err: ', this.job.id, err);
      return def.reject(new kError.QueueFail(this.job, err + ''));
    }

    // shout out to my big b and iron ziz!
    this._publish(channels.Channels.QUEUED);

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
  var promise = hotjob.check();
  return promise;
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
    delay = this.job.delay >>> 0;
    break;
  case states.Job.RETRY:
    delay = this.job.retryInterval >>> 0;
    break;
  case states.Job.GHOST:
    delay = this.job.ghostInterval >>> 0;
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
  var delay = kconfig.get('purgeTimeout');

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
  log.finer('_scheduleRedis() :: Init. jobId, queue: ', this.job.id, queue);
  var def = when.defer();

  // save any bloopers with a 5' scheduling
  if (!_.isNumber(delay)) {
    delay = 300000;
  }
  var scheduleFor = Date.now() + delay;
  // update the job item
  this.job.scheduledFor = scheduleFor;
  this.job.save()
    .always(function(){
      var key = this.NS + ':' + queue;
      this.client.zadd(key, scheduleFor, this.job.id, function(err) {
        if (err) {
          log.db('_scheduleRedis() :: "zadd()" failed!. jobId, key, queue, err:',
            this.job.id, key, queue, err);
          return def.reject(new kError.Database(err));
        }
        def.resolve();
      }.bind(this));
    }.bind(this));
  return def.promise;
};

/**
 * Publish a redis message
 *
 * @param  {kickq.channels.Channels} publishType 'complete' or 'fail'.
 * @private
 */
QueueModel.prototype._publish = function(publishType) {
  log.finer('_publish() :: Init. type, jobId, channel: ', publishType,
    this.job.id, channels.getKey(publishType));
  var jobSerialized = this.job.getPublicJSON();

  this.client.publish( channels.getKey(publishType, this.job.name), jobSerialized );
  this.client.publish( channels.getKey(publishType), jobSerialized );
};
