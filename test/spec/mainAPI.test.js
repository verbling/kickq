/**
 * @fileOverview The kickq API
 */

var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert,
    Kickq  = require('../../');

suite('0.0 API scaffolding', function() {
  test('0.0.1 Static Functions', function() {
    assert.isFunction(Kickq.config, 'should have a "config" static method');
    assert.isFunction(Kickq.reset, 'should have a "reset" static method');
  });

  test('0.0.2 Instance Functions', function() {
    var kickq = new Kickq();
    assert.instanceOf(kickq, Kickq, 'should be an instance of Kickq');
    assert.isFunction(kickq.create, 'should have the "create" method');
    assert.isFunction(kickq.process, 'should have the "process" method');
    assert.isFunction(kickq.delete, 'should have the "delete" method');
  });
});
