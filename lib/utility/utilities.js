/**
 * @fileoverview Helpers.
 */
var utils = module.exports = {};

/**
 * Adds a {@code getInstance} static method that always return the same instance
 * object.
 * @param {!Function} Ctor The constructor for the class to add the static
 *     method to.
 */
utils.addSingletonGetter = function(Ctor) {
  Ctor.getInstance = function() {
    if (Ctor._instance) {
      return Ctor._instance;
    }
    return Ctor._instance = new Ctor;
  };
};