/**
 * @fileOverview Creating Jobs with kickq
 */

var sinon  = require('sinon');
var chai = require('chai');
var expect = chai.expect;
var grunt  = require('grunt');
var assert = require('chai').assert;
var when   = require('when');

var kickq  = require('../../');
var tester = require('../lib/tester');
var jobTest = require('./jobClass.test');

var noop = function(){};

suite('Job Creation', function() {

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


  // The numbering (e.g. 1.1.1) has nothing to do with order
  // The purpose is to provide a unique string so specific tests are
  // run by using the mocha --grep "1.1.1" option.

  suite('1.1 A "plain job"', function() {
    test('1.1.1 Create a "plain job"', function(done) {
      // use the promised pattern so errors are visible
      assert.isFulfilled( kickq.create( tester.fix.jobname, 'data', {},
        function(err, job) {
          assert.isNull(err, 'The "err" arg should be null');
          done();
        }),
        'hotjob promise should resolve');
    });
    test('1.1.2 Verify "plain job" was created', function(done) {
      kickq.create( 'create-verify', 'data', {}, function(err) {
        kickq.process('create-verify', function(job, data, cb) {
          cb(null, done);
        });
      });
    });
    test('1.1.3 Create a "plain job" with no callback', function(done) {
      kickq.create('create-no-callback', 'data', {});
      kickq.process('create-no-callback', function(job, data, cb) {
        cb(null, done);
      });
    });
    test('1.1.4 Create a "plain job" with no options', function(done) {
      kickq.create('create-no-options', 'data', function(err, key) {
        kickq.process('create-no-options', function(job, data, cb) {
          cb(null, done);
        });
      });
    });
    test('1.1.5 Create a "plain job" with no data and no options', function(done) {
      kickq.create('create-no-data', function(err, key) {
        kickq.process('create-no-data', function(job, data, cb) {
          cb(null, done);
        });
      });
    });
    test('1.1.6 Create a "plain job" with only the name', function(done) {
      kickq.create('create-only-name');
      setTimeout(kickq.process('create-only-name', function(job, data, cb) {
        cb(null, done);
      }), 300);
    });
    test('1.1.7 Create a "plain job" and check the returned Job instance', function(done) {
      kickq.create('create-check-jobItem 1.1.7', function(){
        kickq.process('create-check-jobItem 1.1.7', function(job, data, cb) {
          jobTest.testInstanceProps(job);
          assert.equal(job.state, 'processing', 'state of the job should be "processing"' );
          cb(null, done);
        });
      });
    });
  });

  suite('1.2 A "plain job" with Object Data', function() {
    test('Verify "plain job" with Object Data was created', function(done) {
      kickq.create('create-data-object', tester.fix.plain.data, function(){
        kickq.process('create-data-object', function(job, data, cb) {
          assert.deepEqual(data, tester.fix.plain.data, 'data provided should deep equal value passed');
          assert.equal(job.name, 'create-data-object', 'job name provided should equal value passed');
          cb(null, done);
        });
      });
    });
  });

  suite('1.3 A "delayed job"', function() {
    var startTime;

    test('1.3.1 Create a "delayed job"', function(done) {
      this.timeout(3000);

      var createPromise = kickq.create( 'delayed_job 1.3.1', 'data', {delay: 1},
        function(err, job) {
          assert.isNull(err, 'The "err" arg should be null');
          assert.equal('delayed', job.state, 'Job item state should be "delayed"');
        });

      assert.isFulfilled( createPromise,
        'The delayed job create operation should be successful')
      .notify(done);

    });
    test('1.3.2 Verify "delayed job" was created', function(done) {
      this.timeout(2000);
      startTime = Date.now();
      kickq.create( 'delayed_job 1.3.2', 'data',  {delay: 1}, function(){
        kickq.process('delayed_job 1.3.2', function(job, data, cb) {
          var processTime = Date.now();
          assert.ok( (processTime - startTime) > 800, 'job should get processed ' +
            'at least after 800ms');
          done();
        });
      });
    }); // test
  }); // suite 1.3

  suite('1.4 A "hotjob job"', function() {
    var startTime;
    var opts = {
      hotjob: true
    };

    test('1.4.0 create callback returns a promise to use for hotjobs', function(done) {

      function onJobCreate(err, job, promise) {
        assert.ok( when.isPromise(promise), 'create callback should yield' +
        ' a promise in the callback');

        done();
      }

      kickq.create('hotjob_job 1.4.0', 'hotjob job promise check', opts, onJobCreate);
    });


    test('1.4.1 Create a "hotjob job"', function(done) {

      function onJobCreate(err, job, promise) {
        assert.isFulfilled(promise, 'hotjob promise should resolve').notify(done);

        kickq.process('hotjob_job 1.4.1', function(job, data, cb) {
          cb();
        });
      }

      kickq.create('hotjob_job 1.4.1', 'hotjob job data 1.4.1', opts, onJobCreate);
    });

    test('1.4.2 Create a "hotjob job" and test the promise response object',
      function(done) {

      function onJobCreate(err, job, promise) {
        assert.ok( when.isPromise(promise), 'create callback should yield' +
        ' a promise in the callback');
        assert.isFulfilled(promise.then(function(job) {
          assert.ok(job.complete, '"complete" property should be true');
          assert.equal(job.name, 'hotjob_job 1.4.2', '"jobName" property should have proper value');
        }), 'hotjob promise should resolve').notify(done);

        kickq.process('hotjob_job 1.4.2', function(job, data, cb) {
          cb();
        });

      }

      kickq.create('hotjob_job 1.4.2', 'hotjob job data 1.4.2', opts, onJobCreate);
    });

    test('1.4.3 Create a "hotjob job" that will fail', function(done) {

      function onJobCreate(err, job, promise) {
        var testprom = assert.isRejected(promise,
          'hotjob Promise should be rejected').notify(done);

        kickq.process('hotjob_job 1.4.3', function(job, data, cb) {
          cb('error message');
        });
      }

      kickq.create('hotjob_job 1.4.3', 'hotjob job data', opts, onJobCreate);
    });

    suite('Timeout tests', function(){
      var clock;
      setup(function() {
        clock = sinon.useFakeTimers( +new Date());
      });

      teardown(function() {
        clock.restore();
      });
      test('1.4.4 Create a "hotjob job" that will timeout using default timeout value', function(done) {
        var startTime;

        // go back to natural timeout until sinon.useFakeTimers + travis resolves
        // https://github.com/cjohansen/Sinon.JS/issues/268
        // this.timeout(11000);

        function onJobCreate(err, job, promise) {
          startTime = new Date().getTime();

          assert.isFulfilled( promise.then(
            noop, function( err ) {
              var endTime = new Date().getTime();

              assert.ok( (endTime - startTime) > 9000, 'Promise should timeout' +
                ' at least after 9000ms');
            }),
            'hotjob Promise should be fulfilled'
          )
          .notify(done);

          clock.tick(10100);
          // clock.restore();
        }

        kickq.create('hotjob_job 1.4.4', 'hotjob job data', opts, onJobCreate);
      });

      test('1.4.5 Create a "hotjob job" that will timeout using custom ' +
        'timeout value', function(done) {
        var startTime;
        // go back to natural timeout until sinon.useFakeTimers + travis resolves
        // https://github.com/cjohansen/Sinon.JS/issues/268
        // this.timeout(5000);

        var opts = {
          hotjob: true,
          hotjobTimeout: 4
        };
        function onJobCreate(err, id, promise) {
          startTime = new Date().getTime();

          assert.isFulfilled( promise.then(
            noop, function( err ) {
              var endTime = new Date().getTime();
              assert.ok( (endTime - startTime) > 3000, 'Promise should timeout' +
              ' at least after 3000ms');
            }),
            'hotjob Promise should be fulfilled'
          )
          .notify(done);

          clock.tick(4100);
          // clock.restore();
        }
        kickq.create('hotjob_job 1.4.5', 'hotjob job data', opts, onJobCreate);
      });
    });
  });

  suite('1.5 A Job With Retries', function() {
    test('Create a job with 3 retries with an interval of 1 second', function(done){
      var opts = {
        retry: true,
        retryCount: 3,
        retryInterval: 1
      };

      var retryCount = 0;
      var startTime = new Date().getTime();
      this.timeout(7000);

      kickq.create('retry_job', 'retry job data', opts);
      kickq.process('retry_job', function(job, data, cb) {
        retryCount++;
        cb(false);
        if (3 === retryCount) {
          var endTime = new Date().getTime();
          assert.ok( (endTime - startTime) > 4000, 'All 3 retries should complete' +
            ' in less than 7000ms');
          done();
        }
      });
    });
  });

  suite('1.6 Job Creation returns a Promise', function() {
    test('1.6.1 Job Creation returns a promise', function() {
      var createPromise = kickq.create('create-promise-test');
      assert.ok(when.isPromise(createPromise), 'create job should return a promise');
    });
    test('1.6.2 Job creation promise resolves', function(done) {
      var createPromise = kickq.create('create-promise-arguments');
      assert.isFulfilled(createPromise, 'job create promise should resolve').notify(done);
    });
    test('1.6.3 Job creation promise resolves with proper arguments', function(done) {
      var createPromise = kickq.create('create-promise-arguments');
      assert.isFulfilled(createPromise.then(function(job) {
        jobTest.testInstanceProps(job);
        assert.equal(job.name, 'create-promise-arguments', '"job.name" ' +
          'property should have proper value');
      }), 'job create promise should resolve').notify(done);
    });

    test('1.6.4 hotjob creation', function(done) {
      var opts = {hotjob:true};
      var createPromise = kickq.create('create-promise-arguments', 'data', opts);

      assert.isFulfilled(createPromise.then(function(job) {
        assert.ok(job.hotjob, 'job.hotjob flag should be true in job instance');
        assert.ok(when.isPromise(job.hotjobPromise), 'job.hotjobPromise should be a promise');
      }), 'job create promise should resolve').notify(done);
    });

  });

});
