/**
 * @fileOverview Processing Jobs with kickq
 */

var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert,
    Kickq  = require('../../'),
    tester = require('../lib/tester'),
    when   = require('when');


suite('Job Processing', function() {

  setup(function(done) {
    Kickq.reset();
    Kickq.config({
      redisNamespace: tester.NS
    });
    tester.clear();
  });

  teardown(function(done) {
    tester.clear();
    Kickq.reset();
  });

  var kickq = new Kickq();

  test('The Job Object', function() {
    var jobid;

    kickq.create('process-test-one', 'data', {}, function(err, key) {
      jobid = key;
    });
    kickq.process('process-test-one', function(jobObj, data, cb) {
      assert.equal(jobid, jobObj.id, 'The job id should be the same');
      assert.equal(process-test-one, jobObj.name, 'The job name should be the same');
      cb();
      done();
    });
  });

  test('Concurent jobs', function(done) {
    // allow some time to execute
    this.timeout(10000);

    // create 20 jobs
    var jobPromises = [];
    for (var i = 0; i < 20; i++) {
      jobPromises.push(kickq.create('process-test-concurent'));
    }

    var jobProcessCount = 0;
    var jobProcessQueue = [];
    function startProcess() {
      kickq.process('process-test-concurent', 10, function(jobObj, data, cb) {
        jobProcessCount++;
        jobProcessQueue.push(cb);
      });
    }

    when.all(jobPromises).then(startProcess);

    // allow 2s for all to-process jobs to be collected
    setTimeout(function(){
      assert.equal(jobProcessCount, 10, '10 jobs should be queued for processing');
      done();
    }, 2000);
  });

  test('Process creates ghost by never reporting outcome', function(done){
    kickq.create('process-ghost');
    kickq.process('process-ghost', function(jobObj, data, cb) {});

    // give time for jobs to process
    setTimeout(function(){
      ok(false, 'TODO create a test case for ghost jobs');
      done();
    }, 300);
  });


});

