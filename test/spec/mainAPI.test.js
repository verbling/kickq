/**
 * @fileOverview The kickq API
 */

var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert,
    kickq  = require('../../');

suite('0.0 API scaffolding', function() {
  test('0.0.1 Static Functions', function() {
    assert.isFunction(kickq.config, 'should have a "config" function');
    assert.isFunction(kickq.reset, 'should have a "reset" function');
    assert.isFunction(kickq.create, 'should have the "create" function');
    assert.isFunction(kickq.process, 'should have the "process" function');
    assert.isFunction(kickq.delete, 'should have the "delete" function');
  });

});
