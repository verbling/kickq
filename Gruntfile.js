/*jshint camelcase:false */
/*
 * node-asset-pipeline
 * https://github.com/thanpolas/node-asset-pipeline
 *
 * Copyright (c) 2013 Verbling
 * Licensed under the MIT license.
 */

module.exports = function( grunt ) {
  'use strict';

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-clean');

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
      itterative: [ 'test/spec/mainAPI.js' ]
    },

    mochaTestConfig: {
      itterative: {
        options: {
          reporter: 'nyan'
        }
      }
    }


  });

  grunt.registerTask('test', [
    'clean',
    'mochaTest'
  ]);

  grunt.registerTask('default', ['test']);


};

