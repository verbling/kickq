/**
 * @fileOverview Creating Jobs with kickq
 */

var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert,
    Kickq  = require('../../'),
    tester = require('../lib/tester');


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

  suite('A "plain job"', function() {
    test('Create a "plain job"', function(done) {
      var kickq = new Kickq();
      kickq.create(tester.fix.jobname, tester.fix.plain.data, {}, function(err, key) {
        assert.isNull(err, 'The "err" arg should be null');
        assert.isString(key, '"key" arg should be string');
        done();
      });
    });
    test('Verify "plain job" created', function(done) {
      kickq.process(tester.fix.jobname, function(jobName, data, cb) {
        assert.deepEqual(data, tester.fix.plain.data, 'data provided should deep equal value passed');
        assert.equal(jobName, tester.fix.jobname, 'job name provided should equal value passed');
        cb();
        done();
      });
    });
  });

});
