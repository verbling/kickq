/**
 * @fileoverview Main testing library, exporting fixtures, helper functions
 *               etc. All tests must require it.
 */
var jobOpts = require('../fixtures/jobOpts');
var rBuster = require('./redis-buster');


var tester = module.exports = {};


// export fixtures
tester.fix = jobOpts;

tester.NS = rBuster.KEY;

tester.clear = rBuster.clear;