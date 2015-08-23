/**
 * @fileoverview will clean up all created records from running tests
 *               and provide values for the keys to be used.
 */

var redis = require('redis');
var sinon = require('sinon');

var buster = module.exports = {};

var client = redis.createClient();

buster.KEY = '_test_queue';

client.on('error', function(){});

/**
 * Clean all records created by tests
 *
 * @param {Function} done callback
 */
buster.clear = function(done) {
  client.keys(buster.KEY + '*', function(err, response) {
    if (err) {
      done(err);
      return;
    }

    if (!Array.isArray(response)) {
      done();
      return;
    }

    if (0 === response.length) {
      done();
      return;
    }

    client.del(response, done);
  });
};


var stubHmset;
var stubIncr;
var stubRpush;
var stubPublish;
var stubZadd;
var fakeJobId = 0;
var stubWriteOn = false;

buster.stubWrite = function() {
  if (stubWriteOn) {
    return;
  }
  stubWriteOn = true;
  stubHmset = sinon.stub(redis.RedisClient.prototype, 'hmset');
  stubHmset.yields(null);
  stubRpush = sinon.stub(redis.RedisClient.prototype, 'rpush');
  stubRpush.yields(null);
  stubZadd = sinon.stub(redis.RedisClient.prototype, 'zadd');
  stubZadd.yields(null);
  stubPublish = sinon.stub(redis.RedisClient.prototype, 'publish');
  stubIncr = sinon.stub(redis.RedisClient.prototype, 'incr');
  stubIncr.yields(null, fakeJobId);
};

buster.stubWriteRestore = function() {
  if (!stubWriteOn) {
    return;
  }
  stubWriteOn = false;
  stubHmset.restore();
  stubIncr.restore();
  stubRpush.restore();
  stubPublish.restore();
  stubZadd.restore();
};
