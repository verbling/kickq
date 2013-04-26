/**
 * @fileoverview Test kickq's publishing messages.
 */

var sinon  = require('sinon');
var grunt = require('grunt');
var assert = require('chai').assert;
var when   = require('when');
var redis = require('redis');

var kickq = require('../../');
var tester = require('../lib/tester');
var jobItem = require('./jobItem.test');

var noop = function(){};

suite('5. Kickq Redis Published Messages', function() {
  var client;
  setup(function(done) {
    kickq.reset();
    kickq.config({
      redisNamespace: tester.NS,
      // rapid polling
      schedulerInterval: 100,
      schedulerFuzz: 50,
      schedulerLookAhead: 150,
      // short timeouts and intervals
      processTimeout: 20,
      ghostInterval: 200

    });
    client = redis.createClient();
    tester.clear(done);
  });

  teardown(function() {
    client.end();
  });

  test('5.0.1 Create Job Channel', function(done) {

    client.on('message', function(channel, message){
      assert.equal(tester.NS + ':create', channel, 'Channel should be the right one');
      var jobItem = JSON.parse(message);
      assert.equal('channels-test-create', jobItem.name, 'jobItem should have same name (queue)');
      done();
    });
    client.subscribe(tester.NS + ':create');

    kickq.create('channels-test-create');
  });
  test('5.0.2 Queued Job Channel', function(done) {

    client.on('message', function(channel, message){
      assert.equal(tester.NS + ':queued', channel, 'Channel should be the right one');
      var jobItem = JSON.parse(message);
      assert.equal('channels-test-queued', jobItem.name, 'jobItem should have same name (queue)');
      done();
    });
    client.subscribe(tester.NS + ':queued');

    kickq.create('channels-test-queued');
  });
  test('5.0.3 Success Job Channel', function(done) {

    client.on('message', function(channel, message){
      assert.equal(tester.NS + ':success', channel, 'Channel should be the right one');
      var jobItem = JSON.parse(message);
      assert.equal('channels-test-success', jobItem.name, 'jobItem should have same name (queue)');
      done();
    });
    client.subscribe(tester.NS + ':success');

    kickq.create('channels-test-success');
    kickq.process('channels-test-success', function(jobItem, data, cb) {cb();});
  });
  test('5.0.4 FAIL Job Channel - job failed', function(done) {

    client.on('message', function(channel, message){
      assert.equal(tester.NS + ':fail', channel, 'Channel should be the right one');
      var jobItem = JSON.parse(message);
      assert.equal('channels-test-fail', jobItem.name, 'jobItem should have same name (queue)');
      assert.equal('fail', jobItem.state, 'jobItem state should be fail');
      done();
    });
    client.subscribe(tester.NS + ':fail');

    kickq.create('channels-test-fail');
    kickq.process('channels-test-fail', function(jobItem, data, cb) {cb(false);});
  });
  test('5.0.5 FAIL Job Channel - job ghosted', function(done) {

    kickq.config('processTimeout', 10);

    client.on('message', function(channel, message){
      assert.equal(tester.NS + ':fail', channel, 'Channel should be the right one');
      var jobItem = JSON.parse(message);
      assert.equal('channels-test-ghost', jobItem.name, 'jobItem should have same name (queue)');
      assert.equal('ghost', jobItem.state, 'jobItem state should be ghost');
      done();
    });
    client.subscribe(tester.NS + ':fail');

    kickq.create('channels-test-ghost');
    kickq.process('channels-test-ghost', function(jobItem, data, cb) {});
  });
  test('5.0.6 DELETE Job Channel', function(done) {

    kickq.config('purgeTimeout', 10);

    client.on('message', function(channel, message){
      assert.equal(tester.NS + ':delete', channel, 'Channel should be the right one');
      var deleteItem = JSON.parse(message);

      assert.isString(deleteItem.id, '"id" prop of deleteItem should be of right type');
      assert.isString(deleteItem.queue, '"queue" prop of deleteItem should be of right type');
      assert.isObject(deleteItem.jobItem, '"jobItem" prop of deleteItem should be of right type');
      assert.isTrue(deleteItem.status, '"status" prop of deleteItem should be true');
      assert.equal('channels-test-delete', deleteItem.queue, '"queue" prop of deleteItem should have same name as job (queue)');
      assert.equal('channels-test-delete', deleteItem.jobItem.name, 'jobItem should have same name (queue)');
      assert.equal('success', deleteItem.jobItem.state, 'jobItem state should be delete');
      done();
    });
    client.subscribe(tester.NS + ':delete');

    kickq.create('channels-test-delete');
    kickq.process('channels-test-delete', function(jobItem, data, cb) {cb();});
  });

});

