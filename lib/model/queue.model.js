/**
 * @fileoverview Handles proper queueing of the jobs,
 *   publishing events to redis channels.
 *
 */

var _ = require('underscore');
var Promise = require('bluebird');

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
var QueueModel = module.exports = Model.extend(function(jobItem) {
  log.finer('Ctor() :: Init');

  /** @type {Kickq.JobItem} */
  this.job = jobItem;

});

/**
 * Add the job to the right queue, optionally emitting a publish redis event.
 *
 * @return {Promise} A promise.
 */
QueueModel.prototype.save = Promise.method(function() {
  log.fine('save() :: Init. jobId: ', this.job.id, 'state:', this.job.state,
    'Queue:', this.job.name);

  switch(this.job.state) {
  case states.Job.NEW:
    // new jobs get added to process queue
    // check for hotjob option.
    this._publish(channels.Channels.CREATE);

    return this.addToProcessQueue()
      .bind(this)
      .then(this.checkHotjob);
  case states.Job.QUEUED:
    return this.addToProcessQueue();
  case states.Job.PROCESSING:
    // nothing todo here
    break;
  case states.Job.DELAYED:
  case states.Job.RETRY:
  case states.Job.GHOST:
    if (this.job.state !== states.Job.DELAYED) {
      this._publish('fail');
    }
    // schedule
    return this.schedule();
  case states.Job.SUCCESS:
  case states.Job.FAIL:
    function pub() {
      if (this.job.state === states.Job.SUCCESS) {
        // emit complete event
        this._publish(channels.Channels.SUCCESS);
      } else {
        this._publish(channels.Channels.FAIL);
      }
    }

    // nuke schedule
    return this.purgeSchedule()
      .bind(this)
      .then(pub);
  default:
    throw new kError.InvalidState(this.job);
  }

});

/**
 * Add the job to the process queue, emit a publish event on redis.
 *
 * @return {Promise} A promise.
 */
QueueModel.prototype.addToProcessQueue = Promise.method(function() {

  // kickq:queue:[ job name ]
  var queueKey = this.NS + ':queue:' + this.job.name;

  var self = this;
  return new Promise(function(resolve, reject) {
    self.client.rpush( queueKey, self.job.id, function(err) {
      if (err) {
        log.db('addToProcessQueue() :: "rpush" Failed! jobId:', self.job.id,
          'err:', err);
        reject(new kError.QueueFail(self.job, err + ''));
        return;
      }

      // shout out to my big b and iron ziz!
      self._publish(channels.Channels.QUEUED);

      resolve();
    });
  });
});

/**
 * Check if the job has the hotjob flag on and handle it.
 *
 * @return {Promise} A promise.
 */
QueueModel.prototype.checkHotjob = Promise.method(function() {
  var hotjob = new Hotjob(this.job);
  return hotjob.check();
});

/**
 * Schedule the job.
 *
 * @return {Promise} A promise.
 */
QueueModel.prototype.schedule = Promise.method(function() {

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
});

/**
 * Schedule the job to get purged.
 *
 * @return {Promise} A promise.
 */
QueueModel.prototype.purgeSchedule = Promise.method(function() {
  var delay = kconfig.get('purgeTimeout');

  return this._scheduleRedis('scheduled-purge', delay);
});

/**
 * Create the actual scheduling record in redis.
 *
 * @param {string} queue The queue, one of 'scheduled', 'scheduled-purge'.
 * @param {number} delay delay in miliseconds.
 * @return {Promise} A promise.
 * @private
 */
QueueModel.prototype._scheduleRedis = Promise.method(function(queue, delay) {
  log.finer('_scheduleRedis() :: Init. jobId:', this.job.id, 'queue:', queue);

  // save any bloopers with a 5' scheduling
  if (!_.isNumber(delay)) {
    delay = 300000;
  }
  var scheduleFor = Date.now() + delay;

  // update the job item
  this.job.scheduledFor = scheduleFor;

  return this.job.save()
    .bind(this)
    .finally(function(){
      var key = this.NS + ':' + queue;

      var self = this;
      return new Promise(function(resolve, reject) {
        self.client.zadd(key, scheduleFor, self.job.id, function(err) {
          if (err) {
            log.db('_scheduleRedis() :: "zadd()" failed!. jobId, key, queue, err:',
              self.job.id, key, queue, err);
            reject(new kError.Database(err));
            return;
          }
          resolve();
        });
      });
    });
});

/**
 * Publish a redis message
 *
 * @param  {kickq.channels.Channels} publishType 'complete' or 'fail'.
 * @private
 */
QueueModel.prototype._publish = function(publishType) {
  log.finer('_publish() :: Init. type, jobId:', publishType, this.job.id,
    'channel:', channels.getKey(publishType));

  var jobSerialized = this.job.getPublicJSON();

  this.client.publish( channels.getKey(publishType, this.job.name), jobSerialized );
  this.client.publish( channels.getKey(publishType), jobSerialized );
};
