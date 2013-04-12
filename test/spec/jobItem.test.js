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
  var props  = {
    id: assert.isString,
    name: assert.isString,
    complete: assert.isBoolean,
    success: assert.isBoolean,
    createTime: assert.isNumber,
    updateTime: assert.isNumber,
    finishTime: assert.isNull,
    totalProcessTime: assert.isNull,
    delay: assert.isNull,
    processTimeout: assert.isNumber,
    retry: assert.isBoolean,
    retryTimes: assert.isNumber,
    retryInterval: assert.isNumber,
    hotjob: assert.isBoolean,
    hotjobTimeout: assert.isNumber,
    hotjobPromise: assert.isNull,
    ghostRetry: assert.isBoolean,
    ghostTimes: assert.isNumber,
    ghostInterval: assert.isNumber,
    data: assert.isNull,
    lastError: assert.isNull,
    scheduledFor: assert.isNull,
    state: assert.isString,
    runs: assert.isArray,
  };

  var propsAr = _.keys(props);
  propsAr.forEach(function(prop) {
    props[prop](job[prop], 'Should have an "' + prop + '" propert.');
  });

  var jobProps = _.keys(job);
  var diff = _.difference(jobProps, propsAr);

  assert.equal(0, diff.length, 'New props in Job Item: ' + diff.join(', '));

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

  suite('3.1 A new plain job item when processed', function() {
    test('3.1.1 has state: "processing"', function(done) {
      kickq.process('statecheck plain job', function(job){
        assert.equal('processing', job.state, 'state should be "process"');
        done();
      });
    });
    test('3.1.2 passes all jobItem prop tests"', function(done) {
      kickq.process('statecheck plain job', function(job){
        jobItem.testItemProps(job, done);
      });
    });
  });

  suite('3.2 A new job fetched manualy', function() {
    test('3.2.1 Passes the jobItem prop tests', function(done){
      var prom = kickq.get(jobId, function(err, job){
        jobItem.testItemProps(job, done);
      });
    });
  });
});