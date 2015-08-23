/**
 * @fileOverview Assertions for validity of job item.
 */

var chai = require('chai');
var expect = chai.expect;

var jobItemTest = module.exports = {};

/**
 * Checks if the job item has all the expected properties and no more.
 *
 * @param  {kickq.JobItem} jobItem a job item.
 */
jobItemTest.testJobItemProps = function( jobItem ) {
  expect(jobItem).to.have.keys([
    'id',
    'name',
    'complete',
    'success',
    'createTime',
    'updateTime',
    'finishTime',
    'totalProcessTime',
    'delay',
    'processTimeout',
    'retry',
    'retryTimes',
    'retryInterval',
    'hotjob',
    'hotjobTimeout',
    'hotjobPromise',
    'ghostRetry',
    'ghostTimes',
    'ghostInterval',
    'data',
    'lastError',
    'scheduledFor',
    'state',
    'runs'
  ]);
};

/**
 * Test the type of a new Job Item.
 *
 * @param {kickq.JobItem} jobItem The job instance to examine.
 * @param {Function=} optDone the callback to call when all is done.
 */
jobItemTest.testNewItemPropsType = function(jobItem) {
  expect(jobItem.id).to.be.a('string');
  expect(jobItem.name).to.be.a('string');
  expect(jobItem.complete).to.be.a('boolean');
  expect(jobItem.success).to.be.a('boolean');
  expect(jobItem.createTime).to.be.a('number');
  expect(jobItem.updateTime).to.be.a('number');
  expect(jobItem.finishTime).to.be.a('null');
  expect(jobItem.totalProcessTime).to.be.a('null');
  expect(jobItem.delay).to.be.a('null');
  expect(jobItem.processTimeout).to.be.a('number');
  expect(jobItem.retry).to.be.a('boolean');
  expect(jobItem.retryTimes).to.be.a('number');
  expect(jobItem.retryInterval).to.be.a('number');
  expect(jobItem.hotjob).to.be.a('boolean');
  expect(jobItem.hotjobTimeout).to.be.a('number');
  expect(jobItem.hotjobPromise).to.be.a('null');
  expect(jobItem.ghostRetry).to.be.a('boolean');
  expect(jobItem.ghostTimes).to.be.a('number');
  expect(jobItem.ghostInterval).to.be.a('number');
  expect(jobItem.lastError).to.be.a('null');
  expect(jobItem.scheduledFor).to.be.a('null');
  expect(jobItem.state).to.be.a('string');
  expect(jobItem.runs).to.be.a('array');

  // jobItem data can be either null if not set or any other type
  expect(jobItem).to.include.keys('data');

};

/**
 * Test the process item that can be found in the 'runs' array of the job instance.
 *
 * @param  {kickq.JobItem.ProcessItem} processItem The process item to test.
 */
jobItemTest.testProcessItemProps = function( processItem ) {
  expect(processItem).to.have.keys([
    'count',
    'startTime',
    'processTime',
    'processTimeout',
    'state',
    'error',
    'timeout'
  ]);
};
