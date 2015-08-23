/**
 * @fileOverview Test kickq when there's no connection
 */

// var sinon  = require('sinon');
// var expect = require('chai').expect;
// var grunt  = require('grunt');
// var assert = require('chai').assert;

var kickq  = require('../../');
var tester = require('../lib/tester');


suite.skip('No Redis', function() {
  suite('No Redis from the start', function() {
    setup(function() {
      tester.reset();
      kickq.config({
        redisPort: 55555,
      });
      kickq.config('loggerConsole', true);
      kickq.config('loggerLevel', 100);
    });

    teardown(function() {
      tester.reset();
    });

    test('Should not go berserk', function(done) {
      console.log('GO');
      kickq.process('process-test-one', function(job, data, cb) {
        console.log('WTF');
        cb();
        done();
      });
    });
  });

  suite('No Redis from the start', function() {
    this.timeout(300000);

    setup(function() {
      tester.reset();

      kickq.config('schedulerInterval', 1000);
    });

    teardown(function() {
      tester.reset();
    });

    test('Should not go berserk', function(done) {
      console.log('GO');
      kickq.process('process-test-one', function(job, data, cb) {
        console.log('WTF');
        cb();
        done();
      });
    });
  });

});
