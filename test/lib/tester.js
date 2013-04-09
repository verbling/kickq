/**
 * @fileoverview Main testing library, exporting fixtures, helper functions
 *               etc. All tests must require it.
 */
var jobOpts = require('../fixtures/jobOpts.fix');
var rBuster = require('./redis-buster');

// setup promise env
// https://github.com/domenic/mocha-as-promised#node
// https://github.com/domenic/chai-as-promised/#installation-and-setup
//require('mocha-as-promised')();
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);


var tester = module.exports = {};


// export fixtures
tester.fix = jobOpts;

tester.NS = rBuster.KEY;

tester.clear = rBuster.clear;


var redis = require('redis');
var client = redis.createClient();

client.set('key', 'value', function(){
  console.log('redis set:', arguments);
  console.log('\n\n REDIS VERSION:', client.server_info.redis_version, '\n\n');
});