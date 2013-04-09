/*jshint camelcase:false */
/*
 * Kickq
 * Kick jobs out the door, quickly.
 *
 * https://github.com/verbling/kickq
 *
 * Copyright (c) 2013 Verbling
 * Licensed under the MIT license.
 *
 * Authors:
 *   Thanasis Polychronakis (http://thanpol.as)
 *
 */

var reporterUse;

if ( 'true' === process.env.TRAVIS) {
  reporterUse = 'dot';
} else {
  reporterUse = 'nyan';
}

module.exports = function( grunt ) {

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadTasks('tasks');

  //
  // Grunt configuration:
  //
  //
  grunt.initConfig({

    watch: {
      debug: {
        files: ['*.js', 'lib/**/*.js', 'tasks/**/*.js'],
        tasks: [
        ]
      },
      test: {
        files: ['*.js', 'lib/**/*.js', 'tasks/**/*.js', 'test/spec/**/*.js'],
        tasks: ['test']
      }
    },

    /**
     * TESTING
     *
     */
    clean: ['temp/*'],

    mochaTest: {
      itterative: [ 'test/spec/*.js' ]
    },

    mochaTestConfig: {
      itterative: {
        options: {
          // only add the tests that pass
          grep: /(\s1\.1|\s1\.2|\s1\.4|\s1\.6|\s0\.0|\s2\.0)/,
          ui: 'tdd',
          reporter: reporterUse
        }
      }
    }


  });

  grunt.registerTask('test', [
    'clean',
    'mochaTest:itterative'
  ]);

  grunt.registerTask('test:console', [
    'clean',
    'start',
    'mochaTest:itterative'
  ]);

  grunt.registerTask('default', ['test']);


};

