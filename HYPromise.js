class HYPromise {
  constructor(executor) {
    // 初始化状态为pending
    this.status = 'pending';
    // 初始化成功的值为undefined
    this.value = undefined;
    // 初始化失败的原因为undefined
    this.reason = undefined;
    // 初始化成功处理函数队列
    this.onFulfilledCallbacks = [];
    // 初始化失败处理函数队列
    this.onRejectedCallbacks = [];

    // 定义resolve方法
    const resolve = (value) => {
      // 只有在pending状态才能更改状态和值
      if (this.status === 'pending') {
        // 如果是一个promise或者是一个类promise就在其then方法中调用
        if(value instanceof HYPromise || (value && typeof value.then === 'function')) {
          value.then(resolve, reject);
          return;
        }
        this.status = 'fulfilled';
        this.value = value;
        // 执行所有成功处理函数
        this.onFulfilledCallbacks.forEach(callback => callback());
      }
    };

    // 定义reject方法
    const reject = (reason) => {
      // 只有在pending状态才能更改状态和原因
      if (this.status === 'pending') {
        this.status = 'rejected';
        this.reason = reason;
        // 执行所有失败处理函数
        this.onRejectedCallbacks.forEach(callback => callback());
      }
    };

    // 立即执行执行器函数
    try {
      executor(resolve, reject);
    } catch (error) {
      // 如果执行器函数抛出异常，将Promise状态更改为rejected
      reject(error);
    }
  }

  then(onFulfilled, onRejected) {
    // 如果不传处理函数，则使用默认处理函数
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };
  
    // 创建一个新的Promise实例，称为promise2
    const promise2 = new HYPromise((resolve, reject) => {
      if (this.status === 'fulfilled') {
        // 使用setTimeout保证异步调用
        setTimeout(() => {
          try {
            // 调用onFulfilled，并获取返回值
            const x = onFulfilled(this.value);
            // 使用返回值x和新的Promise实例promise2来处理resolve和reject
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            // 如果处理函数抛出异常，则将promise2状态更改为rejected
            reject(error);
          }
        });
      } else if (this.status === 'rejected') {
        // 使用setTimeout保证异步调用
        setTimeout(() => {
          try {
            // 调用onRejected，并获取返回值
            const x = onRejected(this.reason);
            // 使用返回值x和新的Promise实例promise2来处理resolve和reject
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            // 如果处理函数抛出异常，则将promise2状态更改为rejected
            reject(error);
          }
        });
      } else if (this.status === 'pending') {
        // 如果当前Promise状态仍为pending，将处理函数加入相应的队列中
        this.onFulfilledCallbacks.push(() => {
          // 使用setTimeout保证异步调用
          setTimeout(() => {
            try {
              // 调用onFulfilled，并获取返回值
              const x = onFulfilled(this.value);
              // 使用返回值x和新的Promise实例promise2来处理resolve和reject
              resolvePromise(promise2, x, resolve, reject);
            } catch (error) {
              // 如果处理函数抛出异常，则将promise2状态更改为rejected
              reject(error);
            }
          });
        });
  
        this.onRejectedCallbacks.push(() => {
          // 使用setTimeout保证异步调用
          setTimeout(() => {
            try {
              // 调用onRejected，并获取返回值
              const x = onRejected(this.reason);
              // 使用返回值x和新的Promise实例promise2来处理resolve和reject
              resolvePromise(promise2, x, resolve, reject);
            } catch (error) {
              // 如果处理函数抛出异常，则将promise2状态更改为rejected
              reject(error);
            }
          });
        });
      }
    });
  
    // 返回新的Promise实例，以便链式调用
    return promise2;
  }

  catch(onRejected) {
    // 调用then方法，仅传入失败处理函数
    return this.then(null, onRejected);
  }

  finally(callback) {
    // 调用then方法，传入两个相同的处理函数
    return this.then(
      value => {
        // 创建一个新的Promise实例，确保异步执行callback
        return HYPromise.resolve(callback()).then(() => value);
      },
      reason => {
        // 创建一个新的Promise实例，确保异步执行callback
        return HYPromise.resolve(callback()).then(() => { throw reason; });
      }
    );
  }

  static resolve(value) {
    if (value instanceof HYPromise) {
      return value;
    }
    return new HYPromise((resolve, reject) => {
      resolve(value);
    });
  }

  static reject(reason) {
    return new HYPromise((resolve, reject) => {
      reject(reason);
    });
  }

  static all(promises) {
    return new HYPromise((resolve, reject) => {
      const result = [];
      let resolvedCount = 0;

      promises.forEach((promise, index) => {
        HYPromise.resolve(promise).then(
          value => {
            result[index] = value;
            resolvedCount++;
            if (resolvedCount === promises.length) {
              resolve(result);
            }
          },
          reason => {
            reject(reason);
          }
        );
      });
    });
  }

  static race(promises) {
    return new HYPromise((resolve, reject) => {
      promises.forEach(promise => {
        HYPromise.resolve(promise).then(
          value => {
            resolve(value);
          },
          reason => {
            reject(reason);
          }
        );
      });
    });
  }

  static allSettled(promises) {
    return new HYPromise((resolve, reject) => {
      const result = [];
      let settledCount = 0;

      promises.forEach((promise, index) => {
        HYPromise.resolve(promise).then(
          value => {
            result[index] = { status: 'fulfilled', value };
            settledCount++;
            if (settledCount === promises.length) {
              resolve(result);
            }
          },
          reason => {
            result[index] = { status: 'rejected', reason };
            settledCount++;
            if (settledCount === promises.length) {
              resolve(result);
            }
          }
        );
      });
    });
  }

  static any(promises) {
    return new HYPromise((resolve, reject) => {
      const errors = [];
      let rejectedCount = 0;

      promises.forEach((promise, index) => {
        HYPromise.resolve(promise).then(
          value => {
            resolve(value);
          },
          reason => {
            errors[index] = reason;
            rejectedCount++;
            if (rejectedCount === promises.length) {
              reject(new AggregateError(errors, 'All promises were rejected'));
            }
          }
        );
      });
    });
  }
}

function resolvePromise(promise2, x, resolve, reject) {
  // 1. 如果 promise2 和 x 相同，抛出 TypeError
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected for promise'));
  }

  // 标记是否已调用，防止多次调用
  let called = false;

  // 2. 如果 x 是 HYPromise 实例
  if (x instanceof HYPromise) {
    // 根据 x 的状态调用 resolve 或 reject
    x.then(
      y => {
        resolvePromise(promise2, y, resolve, reject);
      },
      reason => {
        reject(reason);
      }
    );
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) { // 3. 如果 x 是对象或函数
    try {
      // 获取 x 的 then 方法
      const then = x.then;
      if (typeof then === 'function') { // 如果 then 是函数
        // 使用 x 作为上下文调用 then 方法
        then.call(
          x,
          y => { // 成功回调
            if (called) return; // 如果已经调用过，直接返回
            called = true;
            // 递归处理 y
            resolvePromise(promise2, y, resolve, reject);
          },
          reason => { // 失败回调
            if (called) return; // 如果已经调用过，直接返回
            called = true;
            reject(reason);
          }
        );
      } else { // 如果 then 不是函数
        // 直接调用 resolve
        resolve(x);
      }
    } catch (error) { // 如果获取或调用 then 方法抛出异常
      if (called) return; // 如果已经调用过，直接返回
      called = true;
      reject(error);
    }
  } else { // 4. 如果 x 不是对象或函数
    // 直接调用 resolve
    resolve(x);
  }
}



module.exports = HYPromise
