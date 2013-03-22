/**
 * @fileoverview will clean up all created records from running tests
 *               and provide values for the keys to be used.
 */

var redis = require('redis');


var buster = module.exports = {};

var client = redis.createClient();

buster.KEY = '_test_queue';

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

    client.del(response, done);
  });
};
