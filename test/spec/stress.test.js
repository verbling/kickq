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
var Ptime = require('profy/time');
var Pmem = require('profy/mem');



var kickq  = require('../../');
var tester = require('../lib/tester');

var noop = function(){};


function stressTest(times) {
  var def = when.defer();

  function checkKickqPerf() {
    return kickq.create('stress test one');
  }

  var mem = new Pmem();
  mem.start();
  var perf = Ptime.getSingleton();
  perf.start();


  //var gcDefer = when.defer();
  //mem.on('finish', gcDefer.resolve);

  var promises = [];
  var promise;
  for(var i = 0; i < times; i++) {
    perf.log('Test loop: ' + i);
    mem.log('Test loop: ' + i);
    promise = checkKickqPerf();
    //promise = when.resolve();
    // promise.then(mem.log.bind(mem, 'master resolve:' + i));
    // promise.then(perf.log.bind(perf, 'master resolve: ' + i));
    promises.push(promise);
  }

  var all = when.all(promises);

  all.then(function(){
    perf.log('finish');
    mem.log('loop-finish');
    var timeRes = perf.result();
    // console.log(timeRes.stats);
    // console.log('firstLog:', timeRes.firstLog, timeRes.lastLog);

    //
    var memRes = mem.result();
    //console.log(mem.resultTable(true));
    def.resolve({memRes: memRes, timeRes: timeRes});
  },def.reject).otherwise(def.reject);

  return def.promise;
}

suite('4. Stress Tests', function() {

  var jobId;
  var stubHmset;
  var stubIncr;
  var stubRpush;
  var stubPublish;
  var stubZadd;
  var fakeJobId = 0;

  setup(function(done) {
    tester.rBuster.stubWrite();
    kickq.reset();
    kickq.config({
      redisNamespace: tester.NS
    });
    tester.clear(done);
  });

  teardown(function(done) {
    tester.rBuster.stubWriteRestore();
    kickq.reset();
    tester.clear(done);
  });

  suite('4.1 Create Jobs', function(){

    test('4.1.1 plain job creation 500 times', function(done){
      this.timeout(5000);
      stressTest(100).then(function(results){
        assert.operator(500, '>', results.timeRes.stats.total, 'Total execution time should not' +
          ' exceed 1000ms');
        assert.operator(2, '>', results.timeRes.stats.mean, 'Mean execution time should not' +
          ' exceed 2ms (travis is slow)');

        // console.log('\n', );
        // console.log(results.memRes.stats);
        // console.log(results.memRes.percent);
        // console.log(results.memRes.firstHeap);

        done();
      }, done).otherwise(done);
    });
  });

});