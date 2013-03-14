/**
 * @fileOverview The kickq task
 */

var sinon  = require('sinon'),
    expect = require('chai').expect,
    grunt  = require('grunt'),
    assert = require('chai').assert;


var tmp = 'temp/';
var expectedPath = 'test/expected/';

describe('kickq go', function(){

  beforeEach(function() {
  });

  afterEach(function() {
  });

  it('should produce the correct less file', function(){
    var actualFile = 'variables.less';
    var actual = grunt.file.read(tmp + actualFile);
    var expected = grunt.file.read(expectedPath + actualFile);
    assert.equal(actual, expected, 'task output should equal: ' + actualFile);
  });
});
