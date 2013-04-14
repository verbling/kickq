/**
 * @fileOverview Job item status and props
 */

var sinon  = require('sinon');
var _ = require('underscore');
var chai = require('chai');
var grunt  = require('grunt');
var assert = require('chai').assert;
var when   = require('when');
var redis = require('redis');
var PerfTime = require('perf-time');

var kickq  = require('../../');
var tester = require('../lib/tester');

var noop = function(){};


function stressTest(times, done) {

  var mem = new tester.Mem();
  mem.start();
  var perf = new tester.Perf();
  perf.start();

  var promises = [];
  var promise;
  for(var i = 0; i < times; i++) {
    perf.log();
    promise = kickq.create('stress test one');
    //promise = when.resolve();
    //promise.then(mem.log.bind(mem));
    // promise.then(perf.log.bind(perf));
    promises.push(promise);
  }

  var all = when.all(promises);

  all.then(function(){
    perf.log();
    var t = new PerfTime();
    var nowTime = t.get();
    //var memStats = mem.result();
    // assert.operator( 30, '>', memStats.stats.mean, 'Mean memory consumption' +
    //     ' is less than 30% from start point.');

    var perfres = perf.result();
    // console.log('Diff perf.result():', t.get() - nowTime);
    // console.log('Diff startTime:', nowTime - perfres.firstLog);

    // console.log(perfres.stats);
    // console.log('firstLog:', perfres.firstLog, perfres.lastLog);
    // console.log('all logs:', perfres.diffs.join(' '));
    done();
  },done).otherwise(done);
}

suite('Stress Tests', function() {

  var jobId;
  var stubHmset;
  var stubIncr;
  var stubRpush;
  var stubPublish;
  var stubZadd;
  var fakeJobId = 0;

  setup(function(done) {
    stubHmset = sinon.stub(redis.RedisClient.prototype, 'hmset');
    stubHmset.yields(null);
    stubRpush = sinon.stub(redis.RedisClient.prototype, 'rpush');
    stubRpush.yields(null);
    stubZadd = sinon.stub(redis.RedisClient.prototype, 'zadd');
    stubZadd.yields(null);
    stubPublish = sinon.stub(redis.RedisClient.prototype, 'publish');
    stubIncr = sinon.stub(redis.RedisClient.prototype, 'incr');
    stubIncr.yields(null, ++fakeJobId);

    kickq.reset();
    kickq.config({
      redisNamespace: tester.NS
    });
    tester.clear(done);
  });

  teardown(function(done) {
    stubHmset.restore();
    stubIncr.restore();
    stubRpush.restore();
    stubPublish.restore();
    stubZadd.restore();
    kickq.reset();
    tester.clear(done);
  });

  suite('4.1 Create Jobs', function(){

    test('4.1.1 plain job creation 10 times', function(done){
      stressTest(500, done);
    });
  });

});