/**
 * @fileoverview The pubsub channels used by kickq.
 */
var channels = module.exports = {};

var kconfig = require('../utility/config');

/**
 * The pubsub channels.
 *
 * @enum {string}
 */
channels.Channels = {
  CREATE: 'create',
  QUEUED: 'queued',
  SUCCESS: 'success',
  FAIL: 'fail'
};

/**
 * Return the proper channel name to pubsub.
 *
 * @param  {channels.Channels} channel The channel.
 * @param  {string=} optVar If channel is variable define the variable part
 *                          here (e.g. kickq:complete:[job name] channel).
 * @return {string} the proper channel to use.
 */
channels.getKey = function(channel, optVar) {
  var out = kconfig.get('redisNamespace') + ':' + channel;

  if (optVar && optVar.length) {
    out += ':' + optVar;
  }

  return out;
};
