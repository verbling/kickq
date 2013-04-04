/**
 * @fileoverview The parent model class, only extend, don't call directly.
 */

var kRedis = require('../utility/kredis');

var Model = module.extends = function() {
  /** @type {redis.CreateClient} redis client */
  this.client = kRedis.client();

};

Model.prototype._logError = function() {

};
