var PerfTime = require('perf-time');
var _ = require('underscore');

var Perf = module.exports = function() {
  this.startTime = null;
  // this.t = new PerfTime();
  this.t = {
    get: function() {
      return Date.now();
    }
  };
  this.logs = [];
  this.tags = [];
};

var _singleton;
Perf.getSingleton = function() {
  if (_singleton) {
    return _singleton;
  }

  return (_singleton = new Perf());
};

Perf.prototype.start = function() {
  this.startTime = this.t.get();
};

Perf.prototype.log = function(optsTag) {
  this.logs.push(this.t.get());
  this.tags.push(optsTag || '');
};


Perf.prototype._getPercent = function(whole, fragment) {
  return this._round(fragment / whole);
};

Perf.prototype._round = function(num) {
  return num;//Math.round(num * 100) / 100;
};

Perf.prototype.result = function() {

  var max = 0;
  var min = 0;
  var diffs = [];
  var cur = 0;
  this.logs.forEach(function(stamp, index) {
    // console.log('stamp:', stamp, index, !_.isNumber(this.logs[index - 1]), stamp - this.logs[index - 1], this.tags[index]);
    if (!_.isNumber(this.logs[index - 1])) {
      return;
    }
    var diff = stamp - this.logs[index - 1];
    diffs.push(diff);
    max = (diff > max ? diff : max);
    min = (diff < min ? diff : min);
  }, this);

  var totalLogs = this.logs.length;
  var mean = 0;
  if ( 1 < diffs.length) {
    mean = diffs.reduce(function(a, b){return a+b;}) / totalLogs;
    mean = this._round(mean);
  }

  var total = this.logs[totalLogs - 1] - this.startTime;

  return {
    stats: {
      max: max,
      min: min,
      mean: mean,
      total: total
    },
    logs: this.logs,
    tags: this.tags,
    diffs: diffs,
    firstLog: this.startTime,
    lastLog: this.logs[totalLogs - 1]
  };

};

