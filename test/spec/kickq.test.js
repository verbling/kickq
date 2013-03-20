/**
 * @fileOverview The kickq API
 */

var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert,
    Kickq  = require('../../');


var tmp = 'temp/';
var expectedPath = 'test/expected/';

describe('API scaffolding', function(){

  describe('Static Functions', function(){
    beforeEach(function() {
    });

    afterEach(function() {
    });

    it('should have a "config" static method', function(){
      assert.isFunction(Kickq.config, 'should have a "config" static method');
    });

    it('should have a "reset" static method', function(){
      assert.isFunction(Kickq.reset, 'should have a "reset" static method');
    });
  });

  describe('Instance Functions', function(){
    var kickq = new Kickq();

    beforeEach(function() {
    });

    afterEach(function() {
    });

    it('should be an instance of Kickq', function(){
       assert.isInstance(kickq, Kickq, 'should be an instance of Kickq');
    });
    it('should have these methods', function(){
      assert.isFunction(kickq.create, 'should have the "create" method');
      assert.isFunction(kickq.process, 'should have the "process" method');
      assert.isFunction(kickq.delete, 'should have the "delete" method');
    });

  });

});
