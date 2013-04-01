/**
 * @fileOverview Creating Jobs with kickq
 */

var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert,
    Kickq  = require('../../'),
    tester = require('../lib/tester'),
    jobTest = require('./jobClass.test'),
    when   = require('when');


suite('Job Creation', function() {

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

  suite('A "plain job"', function() {
    test('Create a "plain job"', function(done) {
      kickq.create(tester.fix.jobname, 'data', {}, function(err, job) {
        assert.isNull(err, 'The "err" arg should be null');
        assert.instanceOf(job, Kickq.Job, 'job is instance of Kickq.Job class');
        done();
      });
    });
    test('Verify "plain job" was created', function(done) {
      kickq.process(tester.fix.jobname, function(job, data, cb) {
        cb();
        done();
      });
    });
    test('Create a "plain job" with no callback', function(done) {
      kickq.create('create-no-callback', 'data', {});
      kickq.process('create-no-callback', function(job, data, cb) {
        cb();
        done();
      });
    });
    test('Create a "plain job" with no options', function(done) {
      kickq.create('create-no-options', 'data', function(err, key) {});
      kickq.process('create-no-options', function(job, data, cb) {
        cb();
        done();
      });
    });
    test('Create a "plain job" with no data and no options', function(done) {
      kickq.create('create-no-data', function(err, key) {});
      kickq.process('create-no-data', function(job, data, cb) {
        cb();
        done();
      });
    });
    test('Create a "plain job" with only the name', function(done) {
      kickq.create('create-only-name');
      kickq.process('create-only-name', function(job, data, cb) {
        cb();
        done();
      });
    });
    test('Create a "plain job" and check the returned Job instance', function(done) {
      kickq.create('create-only-name');
      kickq.process('create-only-name', function(job, data, cb) {
        jobTest.testIntanceProps(job);

        assert.equal(job.state, 'new', 'state of the job should be "new"' );
      });
    });

  });

  suite('A "plain job" with Object Data', function() {
    test('Create a "plain job"', function(done) {
      kickq.create('create-data-object', tester.fix.plain.data, {}, done);
    });
    test('Verify "plain job" with Object Data was created', function(done) {
      kickq.process('create-data-object', function(job, data, cb) {
        assert.deepEqual(data, tester.fix.plain.data, 'data provided should deep equal value passed');
        assert.equal(job.name, 'create-data-object', 'job name provided should equal value passed');
        cb();
        done();
      });
    });
  });

  suite('A "delayed job"', function() {
    var startTime;

    test('Create a "delayed job"', function(done) {
      this.timeout(3000);
      kickq.create('delayed_job', 'delayed job data', {delay: 1}, function(err, job) {
        startTime = new Date().getTime();
        done();
      });
    });
    test('Verify "delayed job" was created', function(done) {
      this.timeout(3000);
      kickq.process('delayed_job', function(job, data, cb) {
        cb();

        var processTime = new Date().getTime();
        assert.ok( (processTime - startTime) > 800, 'job should get processed ' +
          'at least after 800ms');
        done();
      });
    });
  });

  suite('A "hotjob job"', function() {
    var startTime;

    test('Create a "hotjob job"', function(done) {
      var opts = {
        hotjob: true
      };

      function onJobCreate(err, job, promise) {
        assert.ok( when.isPromise(promise), 'create callback should yield' +
        ' a promise in the callback');
        assert.isFulfilled(promise, 'hotjob promise should resolve').notify(done);
      }

      kickq.create('hotjob_job', 'hotjob job data', opts, onJobCreate);
      kickq.process('hotjob_job', function(job, data, cb) {
        cb();
      });
    });

    test('Create a "hotjob job" and test the promise response object',
      function(done) {
      var opts = {
        hotjob: true
      };

      function onJobCreate(err, job, promise) {
        assert.ok( when.isPromise(promise), 'create callback should yield' +
        ' a promise in the callback');
        assert.isFulfilled(promise.then(function(job) {
          assert.ok(job.complete, '"complete" property should be true');
          assert.equal(job.name, 'hotjob_job', '"jobName" property should have proper value');
        }), 'hotjob promise should resolve').notify(done);
      }

      kickq.create('hotjob_job', 'hotjob job data', opts, onJobCreate);
      kickq.process('hotjob_job', function(job, data, cb) {
        cb();
      });
    });

    test('Create a "hotjob job" that will fail', function(done) {
      var opts = {
        hotjob: true
      };

      function onJobCreate(err, id, promise) {
        assert.ok( when.isPromise(promise), 'create callback should yield' +
        ' a promise in the callback');

        assert.isRejected( promise.otherwise(function(err) {
          assert.equal( err, 'error message');
        }), 'hotjob Promise should be rejected')
          .notify(done);
      }

      kickq.create('hotjob_job', 'hotjob job data', opts, onJobCreate);
      kickq.process('hotjob_job', function(job, data, cb) {
        cb('error message');
      });
    });

    test('Create a "hotjob job" that will timeout using default timeout value', function(done) {
      var opts = {
        hotjob: true
      };

      var startTime;

      // raise timeout to 14s
      this.timeout(14000);

      function onJobCreate(err, id, promise) {

        startTime = new Date().getTime();

        assert.isFulfilled( promise.then(function( respObj ) {
          assert.ok( !respObj.complete, 'complete should be false');
          var endTime = new Date().getTime();
          assert.ok( (endTime - startTime) > 9000, 'Promise should timeout' +
            'at least after 9000ms');
        }), 'hotjob Promise should be fulfilled')
          .notify(done);
      }

      kickq.create('hotjob_job', 'hotjob job data', opts, onJobCreate);
    });

    test('Create a "hotjob job" that will timeout using custom timeout value', function(done) {
      var opts = {
        hotjob: true,
        hotjobTimeout: 4
      };

      // raise timeout to 5s
      this.timeout(5000);

      function onJobCreate(err, id, promise) {
        assert.isFulfilled( promise.then(function( respObj ) {
          assert.ok( respObj.complete, 'complete should be true');

          var endTime = new Date().getTime();
          assert.ok( (endTime - startTime) > 3000, 'Promise should timeout' +
            'at least after 3000ms');

        }), 'hotjob Promise should be fulfilled')
          .notify(done);
      }
      kickq.create('hotjob_job', 'hotjob job data', opts, onJobCreate);
    });

  });

  suite('A Job With Retries', function() {
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

  suite('Job Creation returns a Promise', function() {
    test('Job Creation returns a promise', function() {
      var createPromise = kickq.create('create-promise-test');
      assert.ok(when.isPromise(createPromise), 'create job should return a promise');
    });
    test('Job creation promise resolves', function(done) {
      var createPromise = kickq.create('create-promise-arguments');
      assert.isFulfilled(createPromise, 'job create promise should resolve').notify(done);
    });
    test('Job creation promise resolves with proper arguments', function(done) {
      var createPromise = kickq.create('create-promise-arguments');
      assert.isFulfilled(createPromise.then(function(job) {
        jobTest.testIntanceProps(job);
        assert.equal(respObj.name, 'create-promise-arguments', '"job.name" ' +
          'property should have proper value');
      }), 'job create promise should resolve').notify(done);
    });

    test('Job creation with tombstoning', function(done) {
      var createPromise = kickq.create('create-promise-arguments', 'data', {
        hotjob: true
      });
      assert.isFulfilled(createPromise.then(function(job) {
        jobTest.testIntanceProps(job);
        assert.ok(job.hotjob, 'job.hotjob flag should be true in job instance');
        assert.ok(when.isPromise(job.tombPromise), 'job.tombPromise should be a promise');
      }), 'job create promise should resolve').notify(done);
    });

  });

});
