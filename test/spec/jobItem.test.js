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

var jobItemTest = module.exports = {};

/**
 * Checks if the job item has all the expected properties and no more.
 *
 * @param  {kickq.JobItem} jobItem a job item.
 */
jobItemTest.testJobItemProps = function( jobItem ) {
  var props = [
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
  ];

  props.forEach(function(prop) {
    assert.property(jobItem, prop, 'Should have a "' + prop + '" property.');
  }, this);

  var jobProps = _.keys(jobItem);
  var diff = _.difference(jobProps, props);

  assert.equal(0, diff.length, 'New props in Job Item: ' + diff.join(', '));


};

/**
 * Test the props of a new Job Item.
 *
 * @param {kickq.JobItem} jobItem The job instance to examine.
 * @param {Function=} optDone the callback to call when all is done.
 */
jobItemTest.testNewItemPropsType = function( jobItem, optDone ) {
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
    props[prop](jobItem[prop], 'Should have a "' + prop + '" property.');
  });

  var jobProps = _.keys(jobItem);
  var diff = _.difference(jobProps, propsAr);

  assert.equal(0, diff.length, 'New props in Job Item: ' + diff.join(', '));

  done();
};

/**
 * Test the process item that can be found in the 'runs' array of the job instance.
 *
 * @param  {kickq.JobItem.ProcessItem} processItem The process item to test.
 */
jobItemTest.testProcessItemProps = function( processItem ) {
  var props = [
    'count',
    'startTime',
    'processTime',
    'processTimeout',
    'state',
    'errorMessage',
    'timeout'
  ];

  props.forEach(function(prop) {
    assert.property(processItem, prop, 'Should have a "' + prop + '" property.');
  }, this);

  var processProps = _.keys(processItem);
  var diff = _.difference(processProps, props);

  assert.equal(0, diff.length, 'New props in Process Item: ' + diff.join(', '));

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
      kickq.create('jobItem test plain job', function(err, job){
        if (err) {
          done(err);
          return;
        }
        jobId = job.id;
        done();
      });
    });
  });

  teardown(function() {
  });


  // The numbering (e.g. 1.1.1) has nothing to do with order
  // The purpose is to provide a unique string so specific tests are
  // run by using the mocha --grep "1.1.1" option.
  suite('3.0 A new job fetched manualy', function() {
    test('3.0.1 Passes the jobItem prop tests', function(done){
      var prom = kickq.get(jobId, function(err, jobItem){
        jobItemTest.testNewItemPropsType(jobItem, done);
      });
    });
  });

  suite('3.1 A new plain job item when processed', function() {
    test('3.1.0 Has the right properties', function(done) {
      kickq.process('jobItem test plain job', function(jobItem){
        try {jobItemTest.testJobItemProps(jobItem);}
          catch(ex) {done(ex); return;}
        done();
      });
    });

    test('3.1.1 has state: "processing"', function(done) {
      kickq.process('jobItem test plain job', function(jobItem){
        assert.equal('processing', jobItem.state, 'state should be "processing"');
        done();
      });
    });
    test('3.1.2 passes all jobItem prop tests"', function(done) {
      kickq.process('jobItem test plain job', function(jobItem){
        try {jobItemTest.testNewItemPropsType(jobItem, done);}
          catch(ex){done(ex);}
      });
    });
  });

  suite('3.2 A new plain job item after being processed successfully', function() {

    setup(function(done) {
      // create a dummy job and get the id
      kickq.process('jobItem test plain job', function(jobItem, data, cb){
        if (jobId !== jobItem.id) {
          done('Different job id! Created: ' + jobId + ' processed: ' + jobItem.id);
          return;
        }
        setInterval(function() {
          cb(null, done);
        }, 20);
      });
    });

    teardown(function() {});

    test('3.2.0 Check proper props', function(done){
      kickq.get(jobId).then(function(jobItem) {
        jobItemTest.testJobItemProps(jobItem);
        done();
      }, done).otherwise(done);
    });
    test('3.2.1 Check proper prop values', function(done){
      kickq.get(jobId).then(function(jobItem) {
        assert.ok(jobItem.complete, '"complete" prop should be true');
        assert.ok(jobItem.success, '"success" prop should be true');
        assert.isNumber(jobItem.finishTime, '"finishTime" prop should be a number');
        assert.isNumber(jobItem.totalProcessTime, '"totalProcessTime" prop should be a number');

        done();
      }, done).otherwise(done);
    });

    test('3.2.2 Process Item count', function(done){
      kickq.get(jobId).then(function(jobItem) {
        assert.lengthOf(jobItem.runs, 1, 'Should have only 1 process item');
        done();
      }, done).otherwise(done);
    });

    test('3.2.3 Passes all Process Item props tests', function(done){
      kickq.get(jobId).then(function(jobItem) {
        var processItem = jobItem.runs[0];
        jobItemTest.testProcessItemProps(processItem);
        done();
      }, done).otherwise(done);
    });

    test('3.2.4 Process Item has proper values', function(done){
      kickq.get(jobId).then(function(jobItem) {
        var processItem = jobItem.runs[0];

        assert.equal(1, processItem.count, 'Process count No should be 1');
        assert.isNumber(processItem.startTime, 'startTime must be a number');
        assert.isNumber(processItem.processTime, 'processTime should be a number');
        assert.operator(0, '<', processItem.processTime, 'processTime should be' +
          ' larger than 0');
        assert.equal(kickq.states.Job.SUCCESS, processItem.state, 'State should be "success"');
        assert.isNull(processItem.errorMessage, 'errorMessage should be null');
        done();
      }, done).otherwise(done);
    });

  });
});
