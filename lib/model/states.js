/**
 * @fileoverview The states supported by kickq.
 */
var states = module.exports = {};

/**
 * The Job states.
 *
 * @enum {string}
 */
states.Job = {
  NEW: 'new',
  QUEUED: 'queued',
  DELAYED: 'delayed',
  PROCESSING: 'processing',
  RETRY: 'retry',
  GHOST: 'ghost',
  SUCCESS: 'success',
  FAIL: 'fail'
};

/**
 * The process item states, a subset of states.
 *
 * @enum {string}
 */
states.Process = {
  PROCESSING: states.Job.PROCESSING,
  GHOST: states.Job.GHOST,
  SUCCESS: states.Job.SUCCESS,
  FAIL: states.Job.FAIL
};
