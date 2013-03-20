/**
 * @fileOverview Creating Jobs with kickq
 */

var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert,
    jobOpts = require('../fixtures/jobOpts'),
    Kickq  = require('../../');


suite('Job Creation', function() {

  test('Create a plain job', function(){
    var kickq = new Kickq();

    kickq.create(jobOpts.jobname, jobOpts.plain.data, {}, function(err, key) {
      assert.isNull(err, 'The "err" arg should be null');
      assert.isString(key, '"key" arg should be string');
    });
  });

});
