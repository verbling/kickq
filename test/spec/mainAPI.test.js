/**
 * @fileOverview The kickq API
 */

var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert,
    Kickq  = require('../../');

describe('API scaffolding', function() {
  it('Static Functions', function() {
    assert.isFunction(Kickq.config, 'should have a "config" static method');
    assert.isFunction(Kickq.reset, 'should have a "reset" static method');
  });

  it('Instance Functions', function() {
    var kickq = new Kickq();
    assert.isInstance(kickq, Kickq, 'should be an instance of Kickq');
    assert.isFunction(kickq.create, 'should have the "create" method');
    assert.isFunction(kickq.process, 'should have the "process" method');
    assert.isFunction(kickq.delete, 'should have the "delete" method');
  });
});
