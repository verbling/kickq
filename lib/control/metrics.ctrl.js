/**
 * @fileoverview The exposed metrics API.
 */

var EventEmitter = require('events').EventEmitter;
var logg = require('logg');
var log = logg.getLogger('kickq.ctrl.metrics');

var kconfig = require('../utility/config');
var VitalsModel = require('../model/vitals.model');
var MetricsModel = require('../model/metrics.model');



var metrics = module.exports = new EventEmitter();


var vitalsModel = new VitalsModel();
var metricsModel = MetricsModel.getSingleton();

// listeners count
var listeners = {
  vitals: 0,
  metrics: 0
};

var vitalsOn = false;
var metricsOn = false;

// re-transmit events from the metrics models
// they get turned on and off as new listeners come and go
// for this control.
function eventRelay(eventType, publicJobItem) {
  metrics.emit(eventType, publicJobItem);
  metrics.emit('metrics', publicJobItem);
}
vitalsModel.on('vitals', metrics.emit.bind(metrics, 'vitals'));
metricsModel.on('create', eventRelay);
metricsModel.on('queued', eventRelay);
metricsModel.on('success', eventRelay);
metricsModel.on('fail', eventRelay);

/**
 * Triggers whenever a new listener is added.
 *
 * @param {string} eventType The event type.
 * @private
 */
metrics._onNewListener = function(eventType) {
  log.info('_onNewListener() :: type:', eventType);

  switch(eventType) {
  case 'vitals':
    listeners.vitals++;
    metrics._vitalsStart();
    break;
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
  log.info('_onRemoveListener() :: type:', eventType);
  switch(eventType) {
  case 'vitals':
    if (0 === listeners.vitals) {
      break;
    }

    listeners.vitals--;

    if (0 === listeners.vitals) {
      metrics._vitalsStop();
    }
    break;
  case 'metrics':
    if (0 === listeners.metrics) {
      break;
    }

    listeners.metrics--;

    if (0 === listeners.metrics) {
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
 * Start monitoring vitals.
 *
 * @private
 */
metrics._vitalsStart = function(){
  if (vitalsOn) {return;}
  vitalsOn = true;

  vitalsModel.start();
};
/**
 * Stop monitoring vitals.
 *
 * @private
 */
metrics._vitalsStop = function(){
  if (!vitalsOn) {return;}
  vitalsOn = false;

  vitalsModel.stop();
};
/**
 * Start monitoring metrics.
 *
 * @private
 */
metrics._metricsStart = function(){
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
