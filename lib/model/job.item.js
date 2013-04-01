/**
 * @fileoverview A job item.
 */
var State = require('./state.model');

/**
 * The Job object
 *
 * @constructor
 */
var JobItem = module.exports = function() {

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
  this.retryCount = 5;

  /** @type {number} seconds of interval between retrying. */
  this.retryInterval = 1800;

  /** @type {boolean} ???? RENAME???. */
  this.tombstone = false;

  /** @type {number} seconds. */
  this.tombstoneTimeout = 10;

  /** @type {?when.Promise} Tombstone promise. */
  this.tombPromise = null;

  /** @type {*} Any type, passed data on job creation. */
  this.data = null;


  /**
   *
   * the state can be one of:
   *   - new
   *   - delayed
   *   - processing
   *   - retrying
   *   - ghost   :: A re-process state when callback does not report.
   *   - success :: 'complete' flag is true
   *   - fail    :: 'complete' flag is true
   *
   * @type {State.states}
   */
  this.state = State.states.NEW;

  /**
   * Processing runs performed for this job. Can be 1 up to n retries.
   *
   * When the job is new this is an empty array.
   *
   * @type {Array.<JobItem.ProcessItem>} An array of process items.
   */
  this.runs = [];
};

/**
 * A process item.
 *
 * @param {number=} optCount count of item.
 * @constructor
 */
JobItem.ProcessItem = function(optCount) {
  /** @type {number} the process count of this process item. */
  this.count = optCount || 1;
  /** @type {number} JS timestamp. */
  this.start = +new Date();

  /** @type {?number} Processing time in ms or null. */
  this.time = null;

  /**
   * Same as JobItem.state except states: 'new', 'delayed', 'retrying'
   * @type {string}
   */
  this.state = 'processing';
};
