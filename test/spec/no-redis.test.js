/**
 * @fileOverview Test kickq when there's no connection
 */

var sinon  = require('sinon');
var expect = require('chai').expect;
var grunt  = require('grunt');
var assert = require('chai').assert;

var kickq  = require('../../');
var tester = require('../lib/tester');


suite.skip('No Redis', function() {
  setup(function() {
    kickq.reset();
    kickq.config({
      redisPort: 55555,
    });
    kickq.config('loggerConsole', true);
    kickq.config('loggerLevel', 100);
  });

  teardown(function() {
    kickq.reset();
  });

  test('Should not go berserk', function(done) {
    var jobid;
    console.log('GO');
    kickq.process('process-test-one', function(job, data, cb) {
      console.log('WTF');
      cb();
      done();
    });
  });
});
