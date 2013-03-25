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
});

