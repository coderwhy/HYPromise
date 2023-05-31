const HYPromise = require('../HYPromise');

module.exports = {
  resolved: HYPromise.resolve,
  rejected: HYPromise.reject,
  deferred() {
    const result = {};
    result.promise = new HYPromise((resolve, reject) => {
      result.resolve = resolve;
      result.reject = reject;
    });
    return result;
  },
};
