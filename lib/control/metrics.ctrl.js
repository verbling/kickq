/**
 * @fileoverview The exposed metrics API.
 */

var EventEmitter = require('events').EventEmitter;
var logg = require('logg');
var log = logg.getLogger('kickq.ctrl.metrics');

var MetricsModel = require('../model/metrics.model');

var metrics = module.exports = new EventEmitter();

var metricsModel = MetricsModel.getInstance();

// listeners count
var listeners = {
  metrics: 0
};

var metricsOn = false;

// re-transmit events from the metrics models
// they get turned on and off as new listeners come and go
// for this control.
metrics._eventRelay = function(eventType, publicJobItem) {
  metrics.emit(eventType, eventType, publicJobItem);
  metrics.emit('metrics', eventType, publicJobItem);
};
metricsModel.on('create', metrics._eventRelay);
metricsModel.on('queued', metrics._eventRelay);
metricsModel.on('success', metrics._eventRelay);
metricsModel.on('fail', metrics._eventRelay);

/**
 * Triggers whenever a new listener is added.
 *
 * @param {string} eventType The event type.
 * @private
 */
metrics._onNewListener = function(eventType) {
  log.finer('_onNewListener() :: type:', eventType);

  switch(eventType) {
  case 'metrics':
    listeners.metrics++;
    metrics._metricsStart();
    break;
  }
};

/**
 * Triggers whenever a new listener is removed.
 *
 * @param {string} eventType The event type.
 * @private
 */
metrics._onRemoveListener = function(eventType) {
  log.finer('_onRemoveListener() :: type:', eventType);
  switch(eventType) {
  case 'metrics':
    if (listeners.metrics === 0) {
      break;
    }

    listeners.metrics--;

    if (listeners.metrics === 0) {
      metrics._metricsStop();
    }
    break;
  }

};


/**
 * Override EventEmitter's "removeListener" method so it can
 * be observed. The "removeListener" event is only available on node >= v0.10.x
 * https://github.com/joyent/node/issues/4977#issuecomment-14746336
 *
 * TODO When supporting lower node versions does not make sense anymore, switch
 *      to listening on the "removeListener" event.
 *
 * @param {string} eventType The event type.
 * @param {Function} fn callback.
 * @return {Object}
 * @override
 */
metrics.removeListener = function(eventType) {
  metrics._onRemoveListener(eventType);
  return EventEmitter.prototype.removeListener.apply(this, arguments);
};

// TODO When supporting lower node versions does not make sense anymore, switch
//      to listening on the "removeListener" event.
// metrics.on('removeListener', metrics._onRemoveListener);

metrics.on('newListener', metrics._onNewListener);

/**
 * Start monitoring metrics.
 *
 * @private
 */
metrics._metricsStart = function(){
  log.finer('_metricsStart() :: Init. metricsOn: ', metricsOn);
  if (metricsOn) {return;}
  metricsOn = true;

  metricsModel.start();
};
/**
 * Stop monitoring metrics.
 *
 * @private
 */
metrics._metricsStop = function(){
  if (!metricsOn) {return;}
  metricsOn = false;

  metricsModel.stop();
};
