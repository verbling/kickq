/**
 * @fileOverview Creating Jobs with kickq
 */

var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert,
    Kickq  = require('../../'),
    tester = require('../lib/tester'),
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
      kickq.create(tester.fix.jobname, 'data', {}, function(err, key) {
        assert.isNull(err, 'The "err" arg should be null');
        assert.isString(key, '"key" arg should be string');
        done();
      });
    });
    test('Verify "plain job" was created', function(done) {
      kickq.process(tester.fix.jobname, function(jobObj, data, cb) {
        cb();
        done();
      });
    });
  });

  suite('A "plain job" with Object Data', function() {
    test('Create a "plain job"', function(done) {
      kickq.create(tester.fix.jobname, tester.fix.plain.data, {}, function(err, key) {
        assert.isNull(err, 'The "err" arg should be null');
        assert.isString(key, '"key" arg should be string');
        done();
      });
    });
    test('Verify "plain job" with Object Data was created', function(done) {
      kickq.process(tester.fix.jobname, function(jobObj, data, cb) {
        assert.deepEqual(data, tester.fix.plain.data, 'data provided should deep equal value passed');
        assert.equal(jobObj.name, tester.fix.jobname, 'job name provided should equal value passed');
        cb();
        done();
      });
    });
  });

  suite('A "delayed job"', function() {
    var startTime;

    this.timeout(3000);

    test('Create a "delayed job"', function(done) {
      kickq.create('delayed_job', 'delayed job data', {delay: 1}, function(err, key) {
        assert.isNull(err, 'The "err" arg should be null');
        assert.isString(key, '"key" arg should be string');
        startTime = new Date().getTime();
        done();
      });
    });
    test('Verify "delayed job" was created', function(done) {
      kickq.process('delayed_job', function(jobObj, data, cb) {
        cb();

        var processTime = new Date().getTime();
        assert.ok( (processTime - startTime) > 800, 'job should get processed ' +
          'at least after 800ms');
        done();
      });
    });
  });

  suite('A "tombstoned job"', function() {
    var startTime;

    test('Create a "tombstoned job"', function(done) {
      var opts = {
        tombstone: true
      };

      function onJobCreate(err, id, promise) {
        assert.ok( when.isPromise(promise), 'create callback should yield' +
        ' a promise in the callback');
        assert.isFulfilled(promise, 'tombstone promise should resolve').notify(done);
      }

      kickq.create('tombstoned_job', 'tombstoned job data', opts, onJobCreate);
      kickq.process('tombstoned_job', function(jobObj, data, cb) {
        cb();
      });
    });

    test('Create a "tombstoned job" and test the promise response object',
      function(done) {
      var opts = {
        tombstone: true
      };

      function onJobCreate(err, id, promise) {
        assert.ok( when.isPromise(promise), 'create callback should yield' +
        ' a promise in the callback');
        assert.isFulfilled(promise.then(function(respObj) {
          assert.isNumber(respObj.id, 'the Promise response object should have' +
            ' an "id" property, numeric');
          assert.isString(respObj.jobName, 'the Promise response object should' +
            ' have a "jobName" property, string');
          assert.isBoolean(respObj.complete, 'the Promise response object ' +
            'should have a "complete" property, boolean');

          assert.ok(respObj.complete, '"complete" property should be true');
          assert.equal(respObj.jobName, 'tombstoned_job', '"jobName" property should have proper value');
        }), 'tombstone promise should resolve').notify(done);
      }

      kickq.create('tombstoned_job', 'tombstoned job data', opts, onJobCreate);
      kickq.process('tombstoned_job', function(jobObj, data, cb) {
        cb();
      });
    });

    test('Create a "tombstoned job" that will fail', function(done) {
      var opts = {
        tombstone: true
      };

      function onJobCreate(err, id, promise) {
        assert.ok( when.isPromise(promise), 'create callback should yield' +
        ' a promise in the callback');

        assert.isRejected( promise.otherwise(function(err) {
          assert.equal( err, 'error message');
        }), 'tombstone Promise should be rejected')
          .notify(done);
      }

      kickq.create('tombstoned_job', 'tombstoned job data', opts, onJobCreate);
      kickq.process('tombstoned_job', function(jobObj, data, cb) {
        cb('error message');
      });
    });

    test('Create a "tombstoned job" that will timeout using default timeout value', function(done) {
      var opts = {
        tombstone: true
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
        }), 'tombstone Promise should be fulfilled')
          .notify(done);
      }

      kickq.create('tombstoned_job', 'tombstoned job data', opts, onJobCreate);
    });

    test('Create a "tombstoned job" that will timeout using custom timeout value', function(done) {
      var opts = {
        tombstone: true,
        tombstoneTimeout: 4
      };

      // raise timeout to 5s
      this.timeout(5000);

      function onJobCreate(err, id, promise) {
        assert.isFulfilled( promise.then(function( respObj ) {
          assert.ok( respObj.complete, 'complete should be true');

          var endTime = new Date().getTime();
          assert.ok( (endTime - startTime) > 3000, 'Promise should timeout' +
            'at least after 3000ms');

        }), 'tombstone Promise should be fulfilled')
          .notify(done);
      }
      kickq.create('tombstoned_job', 'tombstoned job data', opts, onJobCreate);
    });

  });

  suite('A Job With Retries', function() {
    test('Create a job with 3 retries with an interval of 2 seconds', function(done){
      var opts = {
        retry: true,
        retryCount: 3,
        retryInterval: 1
      };

      var retryCount = 0;
      var startTime = new Date().getTime();
      this.timeout(7000);

      kickq.create('retry_job', 'retry job data', opts);
      kickq.process('retry_job', function(jobObj, data, cb) {
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
});
