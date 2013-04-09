
var exec = require('child_process').exec;
var async  = require('async');

module.exports = function(grunt) {

  var log = grunt.log;

  grunt.registerTask('stop', 'Kill all the servers (reddis)', function() {
    var done = this.async();
    var command = 'killall -9 redis-server';
    exec(command, function(err) {
      if (err) {
        log.error(err);
        done();
        return;
      }
      log.writeln(['All servers killed']);
      done();
    });
  });


  grunt.registerTask('start', 'Start the required servers', function(){
    var done = this.async();
    async.series([
      // redis DB
      function(cb) {
        isRunning('redis-server', function(running){
          if(running) {
            log.writeln(['redis DB is already running, moving on']);
            cb(null);
            return;
          }
          run('redis-server', cb);
        });
      }
      ], function(){
        log.writeln(['']);
        log.writeln(['All servers are now up']);
        done();
      });

  });


  /**
   * Checks if the define process is running
   * @param  {string}  process The process.
   * @return {boolean} yes or no.
   */
  function isRunning(process, cb) {
    var checkCommand = 'ps x|grep ' + process + '|grep -v grep|awk \'{print $1}\'';
    var execOptions = {};

    exec(checkCommand, execOptions, function( err, stdout ) {
      if ( err ) {
        cb(false);
        return;
      }
      if ( stdout ) {
        cb(true, stdout);
        return;
      }
      cb(false);
    });
  }

  /**
   * Run a shell process
   * @param  {string}   command The command.
   * @param  {Function} cb      The callback, always called
   *                            with no params so async moves
   *                            on to next operation.
   */
  function run(command, cb) {
    exec(command, {}, function( err ) {
      if ( err ) {
        log.error( err );
        cb();
        return;
      }
    });
    log.ok(['Command:' + command.yellow + ' run successfully']);
    cb();
  }

};

