var _ = require('underscore');
var when   = require('when');
var sequence = require('when/sequence');

var Perf = require('../lib/perf');
var perf = new Perf();

var noop = function(){};


var main = function() {
  var def = when.defer();
  var def2 = when.defer();
  var def3 = when.defer();

  var getDef2 = function() { return def2.promise;};
  var getDef3 = function() { return def3.promise;};

  sequence([getDef2, getDef3]).then(def.resolve, def.reject);

  setTimeout(def2.resolve);
  setTimeout(def3.resolve);

  return def.promise;
};

console.log('starting...');
perf.start();

var promises = [];

var loops = 500;
var promise;

function asyncNew(i) {
  setTimeout(function(){
    perf.log('Adding main:' + i);
    promise = main();
    promises.push(promise);

    if (loops === i + 1){
      when.all(promises).then(restore);
    }
  });
}

perf.log('before for');
for (var i = 0; i < loops; i++) {
  perf.log(i);
  asyncNew(i);
}

perf.log('after for');

function restore(proms) {
  perf.log('in restore');
  var nowTime = Date.now();
  var res = perf.result();
  console.log('Diff startTime:', nowTime - res.firstLog);
  console.log('proms:', proms.length);
  console.log('stats:', res.stats);
  console.log('diffs:', res.diffs.join(' '));
  console.log('diffs len:', res.diffs.length);
}
