/*jshint camelcase:false */
/**
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
  reporterUse = 'spec';
} else {
  reporterUse = 'spec';
}

module.exports = function( grunt ) {

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-release');
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

    jshint: {
      options: {
        jshintrc: true,
      },
      library: ['lib/**/*.js'],
    },

    /**
     * TESTING
     *
     */
    clean: ['temp/*'],

    release: {
      options: {
        bump: true, //default: true
        file: 'package.json', //default: package.json
        add: true, //default: true
        commit: true, //default: true
        tag: true, //default: true
        push: true, //default: true
        pushTags: true, //default: true
        npm: true, //default: true
        tagName: 'v<%= version %>', //default: '<%= version %>'
        commitMessage: 'releasing v<%= version %>', //default: 'release <%= version %>'
        tagMessage: 'v<%= version %>' //default: 'Version <%= version %>'
      }
    }

  });
};
