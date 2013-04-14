/**
 * @fileOverview profiler stub use with:
 *   node --prof --prof_lazy --log create-profile.js
 */

var nodetime = require('nodetime');
// nodetime.profile({
//   accountKey: 'd40b52c69611162d0e10224d4d4b2ee90c2a0615',
//   appName: 'kickq',
//   debug:true
// });
// nodetime.pause();

var profiler = require('profiler');
var sinon  = require('sinon');
var _ = require('underscore');
var chai = require('chai');
var grunt  = require('grunt');
var assert = require('chai').assert;
var when   = require('when');
var redis = require('redis');
var PerfTime = require('perf-time');

var kickq  = require('../../');
// var tester = require('../lib/tester');
//
var Perf = require('../lib/perf');

var noop = function(){};


var jobId;
var stubHmset;
var stubIncr;
var stubRpush;
var stubPublish;
var stubZadd;
stubHmset = sinon.stub(redis.RedisClient.prototype, 'hmset');
stubHmset.yields(null);
stubRpush = sinon.stub(redis.RedisClient.prototype, 'rpush');
stubRpush.yields(null);
stubZadd = sinon.stub(redis.RedisClient.prototype, 'zadd');
stubZadd.yields(null);
stubPublish = sinon.stub(redis.RedisClient.prototype, 'publish');
stubIncr = sinon.stub(redis.RedisClient.prototype, 'incr');
stubIncr.yields(null, 1);

kickq.reset();
kickq.config({
  redisNamespace: '-test-test'
});


var promise;
var perf = Perf.getSingleton();

// setTimeout(function(){

  console.log('starting kickq.create...');

  perf.start();

  profiler.resume();
  var promises = [];

  perf.log('before for');

  for (var i = 0; i < 500; i++) {
    perf.log(i);
    promise = kickq.create('stress test one');
    // promise.ensure(perf.log.bind(perf));
    promises.push(promise);
  }
  perf.log('after for');
  when.all(promises).then(restore).otherwise(restore);
// }, 8);

function restore(proms) {
  // nodetime.pause();
  profiler.pause();
  var t = new PerfTime();
  perf.log('in restore');
  var nowTime = t.get();
  var res = perf.result();
  console.log('Diff startTime:', nowTime - res.firstLog);

  console.log('proms:', proms.length);
  console.log('stats:', res.stats);
  console.log('diffs:', res.diffs.join(' '));
  console.log('diffs len:', res.diffs.length);

  console.log('restoring stubs...');
  stubHmset.restore();
  stubIncr.restore();
  stubRpush.restore();
  stubPublish.restore();
  stubZadd.restore();
  kickq.reset();
}
