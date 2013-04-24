/**
 * @fileOverview Processing Jobs with kickq
 */

var sinon  = require('sinon');
var grunt = require('grunt');
var assert = require('chai').assert;
var kickq = require('../../');
var tester = require('../lib/tester');
var jobItem = require('./jobItem.test');
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

  teardown(function(done) {
    kickq.reset();
    tester.clear(done);
  });

  test('2.0.1 The job instance argument', function() {
    var jobid;

    kickq.create('process-test-one', 'data', {}, function(err, key) {
      jobid = key;
    });
    kickq.process('process-test-one', function(job, data, cb) {
      jobItem.testNewItemPropsType(job);
      assert.equal(jobid, job.id, 'The job id should be the same');
      assert.equal(job.name, 'process-test-one', 'The job name should be the same');
      assert.equal(job.state, 'processing', 'State should be "processing"');
      assert.equal(job.runs.length, 1, 'there should be one process item');

      var processItem = job.runs[0];
      jobItem.testPtemItem(processItem);
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


});

