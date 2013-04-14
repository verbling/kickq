/**
 * @fileoverview Main testing library, exporting fixtures, helper functions
 *               etc. All tests must require it.
 */
var jobOpts = require('../fixtures/jobOpts.fix');
var rBuster = require('./redis-buster');
var Perf = require('./perf');
// setup promise env
// https://github.com/domenic/mocha-as-promised#node
// https://github.com/domenic/chai-as-promised/#installation-and-setup

require('mocha-as-promised')(require('grunt-mocha-test/node_modules/mocha'));
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);


var tester = module.exports = {};


// export fixtures
tester.fix = jobOpts;

tester.NS = rBuster.KEY;

tester.clear = rBuster.clear;

tester.Perf = Perf;

  // process.memoryUsage()
  // { rss:       13488128,
  //   heapTotal:  6131200,
  //   heapUsed:   2739720
  // }
  //

tester.Mem = function() {
  this.heapStart = null;
  this.heaps = [];
};

tester.Mem.prototype._getMem = function() {
  return process.memoryUsage().heapUsed;
};

tester.Mem.prototype.start = function() {
  this.heapStart = this._getMem();
};

tester.Mem.prototype.log = function() {
  this.heaps.push(this._getMem());
};

tester.Mem.prototype._getPercent = function(whole, fragment) {
  return this._round(fragment / whole);
};

tester.Mem.prototype._round = function(num) {
  return Math.round(num * 100) / 100;
};

tester.Mem.prototype.result = function() {

  var max = 0;
  var min = 0;
  var curs = [];
  var cur = 0;
  this.heaps.forEach(function(heapUsed) {
    cur = this._getPercent(this.heapStart, heapUsed);
    max = (cur > max ? cur : max);
    min = (cur < min ? cur : min);
    curs.push(cur);
  }, this);

  var totalLogs = this.heaps.length;
  var mean = curs.reduce(function(a, b){return a+b;}) / totalLogs;
  mean = this._round(mean);
  var last = this._getPercent(this.heapStart, this.heaps[totalLogs - 1]);

  return {
    stats: {
      max: max,
      min: min,
      mean: mean,
      last: last
    },
    heaps: this.heaps,
    firstHeap: this.heapStart
  };

};

