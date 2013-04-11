/**
 * @fileOverview Job item status and props
 */

var sinon  = require('sinon');
var chai = require('chai');
var grunt  = require('grunt');
var assert = require('chai').assert;
var when   = require('when');

var kickq  = require('../../');
var tester = require('../lib/tester');
var jobTest = require('./jobClass.test');

var noop = function(){};

suite('Job Item Status and Props', function() {

  var jobId;

  setup(function(done) {
    kickq.reset();
    kickq.config({
      redisNamespace: tester.NS
    });
    tester.clear(function(){
      // create a dummy job and get the id
      kickq.create('statecheck plain job', function(err, job){
        if (err) {
          done(err);
          return;
        }
        jobId = job.id;
        done();
      });
    });
  });

  teardown(function(done) {
    kickq.reset();
    tester.clear(done);
  });


  // The numbering (e.g. 1.1.1) has nothing to do with order
  // The purpose is to provide a unique string so specific tests are
  // run by using the mocha --grep "1.1.1" option.

  suite('3.1 A new job has "new" state', function() {
    test('3.1.1 A new job has "new" state', function(done) {
      done();
    });
  });
});