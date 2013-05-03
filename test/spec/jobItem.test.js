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

suite('3. Job Item Status and Props', function() {

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
    var jobItem;
    setup(function(done) {
      kickq.get(jobId, function(err, job){
        jobItem = job;
        done(err);
      });
    });
    test('3.0.1 Passes the jobItem prop tests', function(done){
      jobItemTest.testNewItemPropsType(jobItem, done);
    });
    test('3.0.2 Check default values', function(){
      assert.equal(10000, jobItem.processTimeout, 'processTimeout should have the proper default value');
      assert.equal(null, jobItem.delay, 'delay should have the proper default value');
      assert.equal(true, jobItem.ghostRetry, 'ghostRetry should have the proper default value');
      assert.equal(1, jobItem.ghostTimes, 'ghostTimes should have the proper default value');
      assert.equal(1800000, jobItem.ghostInterval, 'ghostInterval should have the proper default value');
      assert.equal(false, jobItem.hotjob, 'hotjob should have the proper default value');
      assert.equal(10000, jobItem.hotjobTimeout, 'hotjobTimeout should have the proper default value');
      assert.equal(false, jobItem.retry, 'retry should have the proper default value');
      assert.equal(3, jobItem.retryTimes, 'retryTimes should have the proper default value');
      assert.equal(1800000, jobItem.retryInterval, 'retryInterval should have the proper default value');
    });

    test('3.0.3 Check .get callback is called when no results', function(done) {
      var spy = sinon.spy();
      kickq.get('does not exist', spy);

      // wait a bit and check if callback called
      setTimeout(function() {
        assert.ok(spy.calledOnce, 'Callback should be called once');
        done();
      }, 100);
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


suite('3.3 Failure Conditions', function() {
  var jobId;

  setup(function(done) {
    kickq.reset();
    kickq.config({
      // loggerConsole: true,
      // loggerLevel: kickq.LogLevel.FINE,
      redisNamespace: tester.NS,
      // rapid polling
      schedulerInterval: 100,
      schedulerFuzz: 50,
      schedulerLookAhead: 150,
      // short timeouts and intervals
      processTimeout: 20,
      ghostInterval: 200
    });
    tester.clear(function(){
      // create a dummy job and get the id
      kickq.create('jobItem test fail job', function(err, job){
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


  suite('3.3.1 Ghost Jobs', function() {
    setup(function(done) {
      done();
    });

    test('3.3.1.1 Will ghost and wait to reprocess', function(done){
      var processTimes = 0;
      kickq.process('jobItem test fail job', function(jobItem, data, cb) {
        processTimes++;
      });

      setTimeout(function() {
        assert.equal(2, processTimes, 'The job should be processed only two times');
        done();
      }, 1000);
    });

    test('3.3.1.2 Will ghost and wait to reprocess 11 jobs', function(done){
      var processTimes = 0;
      kickq.process('jobItem test fail job', function(jobItem, data, cb) {
        processTimes++;
      });

      // create 10 jobs
      for (var i = 0; i < 10; i++) {
        kickq.create('jobItem test fail job');
      }

      setTimeout(function() {
        assert.equal(22, processTimes, 'The job should be processed only 22 times');
        done();
      }, 1000);
    });

    test('3.3.1.3 Will ghost and add a new worker in the mix', function(done){
      var processTimes = 0;
      kickq.process('jobItem test fail job', function(jobItem, data, cb) {
        processTimes++;
      });

      // create 10 jobs
      for (var i = 0; i < 10; i++) {
        kickq.create('jobItem test fail job');
      }

      var noTimes = 0;
      setTimeout(function() {
        kickq.process('jobItem test fail job', function(){
          noTimes++;
        });

        setTimeout(function() {
          assert.equal(0, noTimes, 'No more job items should be processed');
          done();
        }, 500);
      }, 1000);
    });

    test('3.3.1.4 Will ghost and examine the Job Item properties', function(done){
      var processTimes = 0;
      kickq.process('jobItem test fail job', function(jobItem, data, cb) {
        processTimes++;
      });

      setTimeout(function() {
        kickq.get(jobId).then(function(jobItemFetched) {
          assert.equal(2, jobItemFetched.runs.length, 'There should be two' +
            ' process items');

          assert.equal(kickq.states.Job.FAIL, jobItemFetched.state,
            'Job Item state should be "fail"');

          assert.ok(jobItemFetched.complete, 'Job Item should be complete');
          assert.ok(!jobItemFetched.success, 'Job Item should have success prop false');

          assert.equal(kickq.states.Job.GHOST, jobItemFetched.runs[0].state,
            'First process item state should be "ghost"');
          assert.equal(kickq.states.Job.GHOST, jobItemFetched.runs[1].state,
            'Second process item state should be "ghost"');
          done();
        }).otherwise(done);
      }, 1000);
    });
  });

  suite('3.3.2 Failed Jobs', function() {
    var jobItem;

    // process, reject and fetch the job.
    setup(function(done) {
      kickq.process('jobItem test fail job', function(job, data, cb) {
        cb(false, function() {
          kickq.get(job.id).then(function(fetchedJob) {
            jobItem = fetchedJob;
            done();
          }, done);
        });
      });
    });

    test('3.3.2.1 Job item should have the proper values in its props', function(){
      assert.equal('fail', jobItem.state, 'Job item should have a state of "fail"');
    });
  });
});


suite('3.4 Configuring Job Item', function() {
  var jobId;

  setup(function(done) {
    kickq.reset();
    kickq.config({
      redisNamespace: tester.NS,
      // loggerConsole: true,
      // loggerLevel: kickq.LogLevel.FINE,
      delay: 10,
      ghostRetry: false,
      processTimeout: 20,
      ghostInterval: 200,
      retry: true,
      retryTimes: 5,
      retryInterval: 100
    });
    tester.clear(function(){
      // create a dummy job and get the id
      kickq.create('jobItem test fail job', function(err, job){
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


  suite('3.4.1 Global Cofiguration Options', function() {
    var jobItem;
    setup(function(done) {
      kickq.get(jobId).then(function(jobItemFetched) {
        jobItem = jobItemFetched;
        done();
      });
    });

    test('3.4.1.1 Proper values on configurable properties', function(done){
      assert.equal(10, jobItem.delay, 'Prop "delay" should have proper value');
      assert.equal(false, jobItem.ghostRetry, 'Prop "ghostRetry" should have proper value');
      assert.equal(20, jobItem.processTimeout, 'Prop "processTimeout" should have proper value');
      assert.equal(200, jobItem.ghostInterval, 'Prop "ghostInterval" should have proper value');
      assert.equal(true, jobItem.retry, 'Prop "retry" should have proper value');
      assert.equal(5, jobItem.retryTimes, 'Prop "retryTimes" should have proper value');
      assert.equal(100, jobItem.retryInterval, 'Prop "retryInterval" should have proper value');
      done();
    });

    test('3.4.1.2 Testing setState method', function(done){
      var jobIt = new kickq.JobItem(jobItem);

      jobIt.setState(kickq.states.Job.QUEUED).then(function() {
        kickq.get(jobId).then(function(jobItemFetched) {
          assert.equal(kickq.states.Job.QUEUED, jobItemFetched.state, 'State of' +
            ' fetched item should be "queued"');
          done();
        }, done).otherwise(done);


      }, done);
    });

  });

});