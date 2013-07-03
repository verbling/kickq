/**
 * @fileOverview Processing Jobs with kickq
 */

var sinon  = require('sinon');
var grunt = require('grunt');
var assert = require('chai').assert;
var kickq = require('../../');
var tester = require('../lib/tester');
var jobItemTest = require('./jobItem.test');
var when   = require('when');

var noop = function(){};

suite('2.0 Job Processing', function() {

  setup(function(done) {
    kickq.reset();
    kickq.config({
      redisNamespace: tester.NS
    });
    tester.clear(done);
  });

  teardown(function() {
  });

  test('2.0.1 The job instance argument', function() {
    var jobid;

    kickq.create('process-test-one', 'data', {}, function(err, key) {
      jobid = key;
    });
    kickq.process('process-test-one', function(job, data, cb) {
      jobItemTest.testNewItemPropsType(job);
      assert.equal(jobid, job.id, 'The job id should be the same');
      assert.equal(job.name, 'process-test-one', 'The job name should be the same');
      assert.equal(job.state, 'processing', 'State should be "processing"');
      assert.equal(job.runs.length, 1, 'there should be one process item');

      var processItem = job.runs[0];
      jobItemTest.testPtemItem(processItem);
      assert.equal(processItem.count, 1, 'The process count should be 1 (the first)');
      assert.equal(processItem.state, 'processing', 'The process item should be "processing"');

      cb();
      done();
    });
  });

  test('2.0.2 Concurrent jobs', function(done) {
    // allow some time to execute
    this.timeout(5000);

    // create 20 jobs
    var jobPromises = [];
    for (var i = 0; i < 20; i++) {
      jobPromises.push(kickq.create('process-test-Concurrent'));
    }

    var jobProcessCount = 0;
    var jobProcessQueue = [];
    function startProcess() {
      var opts = {concurrentJobs: 10};
      kickq.process('process-test-Concurrent', opts, function(jobObj, data, cb) {
        jobProcessCount++;

      });
      // allow for all to-process jobs to be collected
      setTimeout(function(){
        assert.equal(jobProcessCount, 10, '10 jobs should be queued for processing');
        done();
      }, 3000);
    }

    when.all(jobPromises).then(startProcess);
  });

  //
  // TODO when we expose a .get() method so we can fetch the job and examine it
  //
  // test('2.0.3 Process creates ghost by never reporting outcome', function(done){
  //   var clock = sinon.useFakeTimers();

  //   var firstPop = true;
  //   kickq.create('process-ghost', {processTimeout:2000}).then(function(){
  //     kickq.process('process-ghost', function(jobObj, data, cb) {
  //       if (firstPop) {
  //         firstPop = false;
  //         clock.tick(2100);
  //         return;
  //       }
  //     });
  //   });
  // });


  test('2.0.4 Multiple jobs', function(done) {
    // allow some time to execute
    this.timeout(5000);

    // create 20 jobs
    var jobPromises = [];
    for (var i = 0; i < 20; i++) {
      jobPromises.push(kickq.create('process-test-multiple'));
    }

    var jobProcessCount = 0;
    var jobProcessQueue = [];
    function startProcess() {
      var opts = {concurrentJobs: 1};
      kickq.process('process-test-multiple', opts, function(jobObj, data, cb) {
        jobProcessCount++;
        cb();
      });
      // allow for all to-process jobs to be collected
      setTimeout(function(){
        assert.equal(jobProcessCount, 20, '20 jobs should be queued for processing');
        done();
      }, 3000);
    }

    when.all(jobPromises).then(startProcess);
  });
});

suite('2.1 Processing Edge Cases', function() {
  var jobId;

  setup(function(done) {
    kickq.reset();
    kickq.config({
      redisNamespace: tester.NS,
      loggerConsole: true,
      loggerLevel: kickq.LogLevel.FINER
    });
    tester.clear(function(){
      // create a dummy job and get the id
      kickq.create('process-test-edge', 'one', function(err, job){
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

  test('2.1.1 Lost worker listener', function(done) {
    // process one job, reset kickq, create one job, process job


    function step2() {
      // reset
      kickq.reset();
      kickq.config('redisNamespace', tester.NS);

      kickq.config({
        loggerConsole: true,
        loggerLevel: kickq.LogLevel.FINER
      });

      // create
      kickq.create('process-test-edge', 'two');

      // process
      kickq.process('process-test-edge', function(jobItem, data, cb2) {
        if ('two' !== data) {
          done('Expected "two" got: ', data);
          return;
        }
        done();
      });
    }

    kickq.process('process-test-edge', function(jobItem, data, cb) {
      cb(null, function(){
        // wait a bit so popJob model issues another BLPOP
        setTimeout(step2, 100);
      });
    });
  });
});
