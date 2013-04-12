/**
 * @fileOverview Job item status and props
 */

var sinon  = require('sinon');
var _ = require('underscore');
var chai = require('chai');
var grunt  = require('grunt');
var assert = require('chai').assert;
var when   = require('when');

var kickq  = require('../../');
var tester = require('../lib/tester');

var noop = function(){};

var jobItem = module.exports = {};

/**
 * Test the new job item has all properties expected.
 *
 * @param {Kickq.Job} job The job instance to examine.
 * @param {Function=} optDone the callback to call when all is done.
 * @param {string} testTitle [description]
 */
jobItem.testItemProps = function( job, optDone ) {
  var done = optDone || function(){};
  assert.isString(job.id, 'should have an "id" property, numeric');
  assert.isString(job.name, 'should have a "name" property, string');
  assert.isBoolean(job.complete, 'should have a "complete" property, boolean');
  assert.isBoolean(job.success, 'should have a "success" property, boolean');
  assert.isNumber(job.createTime, 'should have a "createTime" property, number');

  assert.isNull(job.finishTime, 'should have a "finishTime" property, null');
  assert.isNull(job.totalProcessTime, 'should have a "totalProcessTime" property, null');
  assert.isString(job.state, 'should have a "state" property, string');
  assert.isBoolean(job.retry, 'should have a "retry" property, boolean');
  assert.isNumber(job.retryTimes, 'should have a "retryTimes" property, number');
  assert.isNumber(job.retryInterval, 'should have a "retryInterval" property, number');
  assert.isBoolean(job.hotjob, 'should have a "hotjob" property, boolean');
  assert.isNumber(job.hotjobTimeout, 'should have a "hotjobTimeout" property, number');
  assert.isNull(job.hotjobPromise, 'should have a "hotjobPromise" property, null');
  assert.isNull(job.data, 'should have a "data" property, null');
  assert.isArray(job.runs, 'should have a "runs" property, Array');

  // 24
  // console.log('key len:', _.keys(job).length);

  done();
};

/**
 * Test the process item that can be found in the 'runs' array of the job instance.
 *
 * @param  {Object} processItem The process item to test.
 */
jobItem.testProcessItem = function( processItem ) {
  assert.isNumber(processItem.count, 'should have a "count" property, number');
  assert.isNumber(processItem.start, 'should have a "start" property, number');
  assert.isNull(processItem.time, 'should have a "time" property, null');
  assert.isString(processItem.state, 'should have a "state" property, string');
};

suite('Job Item Status and Props', function() {

  var jobId;

  setup(function(done) {
    kickq.reset();
    kickq.config({
      redisNamespace: tester.NS
    });
    tester.clear(function(){
      // create a dummy job and get the id
      kickq.create('statecheck plain job', function(err, job){
        if (err) {
          done(err);
          return;
        }
        jobId = job.id;
        done();
      });
    });
  });

  teardown(function(done) {
    kickq.reset();
    tester.clear(done);
  });


  // The numbering (e.g. 1.1.1) has nothing to do with order
  // The purpose is to provide a unique string so specific tests are
  // run by using the mocha --grep "1.1.1" option.

  suite('3.1 A new job has "new" state', function() {
    test('3.1.1 A new job has "new" state', function(done) {
      kickq.process('statecheck plain job', function(){


        done();
      });
    });
  });
});