/**
 * @fileoverview The job read/write/update operations using redis.
 *
 */

var _     = require('underscore'),
    when  = require('when');

var kickRedis = require('../utility/kredis');

/**
 * Create a new job Class.
 *
 * @param {} [varname] [description]
 * @constructor
 */
var JobModel = module.exports = function( jobItem ) {

  /** @type {redis.CreateClient} redis client */
  this.client = kickRedis.client();

  /** @type {when.Deferred} The deferred to resolve when save completes */
  this.defer = when.defer();

  this.job = jobItem;
};

/**
 * Save the new job item.
 *
 * @return {when.Promise} a promise.
 */
JobModel.prototype.save = function() {

};