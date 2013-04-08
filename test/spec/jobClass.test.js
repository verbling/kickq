
var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert,
    Kickq  = require('../../'),
    tester = require('../lib/tester'),
    when   = require('when');


var jobTest = module.exports = {};

/**
 * Test the job instance has all properties and methods expected.
 *
 * @param {Kickq.Job} job The job instance to examine.
 * @param {Function=} optDone the callback to call when all is done.
 * @param {string} testTitle [description]
 */
jobTest.testInstanceProps = function( job, optDone ) {
  var done = optDone || function(){};
  assert.isNumber(job.id, 'should have an "id" property, numeric');
  assert.isString(job.name, 'should have a "name" property, string');
  assert.isBoolean(job.complete, 'should have a "complete" property, boolean');
  assert.isBoolean(job.success, 'should have a "success" property, boolean');
  assert.isNumber(job.createTime, 'should have a "createTime" property, number');

  assert.isNull(job.finishTime, 'should have a "finishTime" property, null');
  assert.isNull(job.totalProcessTime, 'should have a "totalProcessTime" property, null');
  assert.isString(job.state, 'should have a "state" property, string');
  assert.isRetry(job.retry, 'should have a "retry" property, boolean');
  assert.isNumber(job.retryCount, 'should have a "retryCount" property, number');
  assert.isNumber(job.retryInterval, 'should have a "retryInterval" property, number');
  assert.isBoolean(job.hotjob, 'should have a "hotjob" property, boolean');
  assert.isNumber(job.hotjobTimeout, 'should have a "hotjobTimeout" property, number');
  assert.isNull(job.tombPromise, 'should have a "tombPromise" property, null');
  assert.isNull(job.data, 'should have a "data" property, null');
  assert.isArray(job.runs, 'should have a "runs" property, Array');
  done();
};

/**
 * Test the process item that can be found in the 'runs' array of the job instance.
 *
 * @param  {Object} processItem The process item to test.
 */
jobTest.testProcessItem = function( processItem ) {
  assert.isNumber(processItem.count, 'should have a "count" property, number');
  assert.isNumber(processItem.start, 'should have a "start" property, number');
  assert.isNull(processItem.time, 'should have a "time" property, null');
  assert.isString(processItem.state, 'should have a "state" property, string');
};