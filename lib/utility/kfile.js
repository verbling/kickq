/**
 * Stripped grunt file module.
 *
 * grunt
 * http://gruntjs.com/
 *
 * Copyright (c) 2013 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 * https://github.com/gruntjs/grunt/blob/master/LICENSE-MIT
 */

'use strict';

// Nodejs libs.
var fs = require('fs');
var path = require('path');

// The module to be exported.
var file = module.exports = {};

// The default file encoding to use.
file.defaultEncoding = 'utf8';

var pathSeparatorRe = /[\/\\]/g;

// Like mkdir -p. Create a directory and any intermediary directories.
file.mkdir = function(dirpath, mode) {
  // Set directory mode in a strict-mode-friendly way.
  if (mode == null) {
    mode = parseInt('0777', 8) & (~process.umask());
  }
  dirpath.split(pathSeparatorRe).reduce(function(parts, part) {
    parts += part + '/';
    var subpath = path.resolve(parts);
    if (!file.exists(subpath)) {
      try {
        fs.mkdirSync(subpath, mode);
      } catch(e) {
        throw new Error('Unable to create directory "' + subpath + '" (Error code: ' + e.code + ').', e);
      }
    }
    return parts;
  }, '');
};


// Write a file.
file.write = function(filepath, contents, options) {
  if (!options) { options = {}; }
  // Create path, if necessary.
  file.mkdir(path.dirname(filepath));
  try {
    // Actually write file.
    fs.writeFileSync(filepath, contents);
    return true;
  } catch(e) {
    throw new Error('Unable to write "' + filepath + '" file (Error code: ' + e.code + ').', e);
  }
};


// True if the file path exists.
file.exists = function() {
  var filepath = path.join.apply(path, arguments);
  return fs.existsSync(filepath);
};

// True if the file is a symbolic link.
file.isLink = function() {
  var filepath = path.join.apply(path, arguments);
  return file.exists(filepath) && fs.lstatSync(filepath).isSymbolicLink();
};

// True if the path is a directory.
file.isDir = function() {
  var filepath = path.join.apply(path, arguments);
  return file.exists(filepath) && fs.statSync(filepath).isDirectory();
};

// True if the path is a file.
file.isFile = function() {
  var filepath = path.join.apply(path, arguments);
  return file.exists(filepath) && fs.statSync(filepath).isFile();
};

// Is a given file path absolute?
file.isPathAbsolute = function() {
  var filepath = path.join.apply(path, arguments);
  return path.resolve(filepath) === filepath.replace(/[\/\\]+$/, '');
};

// Do all the specified paths refer to the same path?
file.arePathsEquivalent = function(first) {
  first = path.resolve(first);
  for (var i = 1; i < arguments.length; i++) {
    if (first !== path.resolve(arguments[i])) { return false; }
  }
  return true;
};

// Are descendant path(s) contained within ancestor path? Note: does not test
// if paths actually exist.
file.doesPathContain = function(ancestor) {
  ancestor = path.resolve(ancestor);
  var relative;
  for (var i = 1; i < arguments.length; i++) {
    relative = path.relative(path.resolve(arguments[i]), ancestor);
    if (relative === '' || /\w+/.test(relative)) { return false; }
  }
  return true;
};

// Test to see if a filepath is the CWD.
file.isPathCwd = function() {
  var filepath = path.join.apply(path, arguments);
  try {
    return file.arePathsEquivalent(process.cwd(), fs.realpathSync(filepath));
  } catch(e) {
    return false;
  }
};

// Test to see if a filepath is contained within the CWD.
file.isPathInCwd = function() {
  var filepath = path.join.apply(path, arguments);
  try {
    return file.doesPathContain(process.cwd(), fs.realpathSync(filepath));
  } catch(e) {
    return false;
  }
};

