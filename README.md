# 手写Promise：实现符合Promises/A+规范的Promise

本文将指导你一步步实现一个符合Promises/A+规范的Promise，帮助你深入理解Promise的工作原理和实现细节。

我们将使用一个名为`HYPromise`的类来实现Promise。

![通过测试](https://coderwhy-1257727333.cos.ap-guangzhou.myqcloud.com/uPic/image-20230531171032267.png)

## 一. 整体介绍

Promise是JavaScript中非常重要的一个概念，它是一种用于处理异步操作的编程模型。Promise提供了一种优雅的方式来处理异步操作的成功或失败，以及它们之间的依赖关系。这使得我们可以避免回调地狱（Callback Hell）的问题，编写更清晰、更易于理解的代码。

Promises/A+是一个对Promise行为的开放规范，它规定了Promise应该如何表现和实现。遵循这个规范的Promise实现可以确保它们之间的互操作性，使得我们可以在不同的库和框架中轻松地使用它们。在本文中，我们将实现一个名为`HYPromise`的类，它将遵循Promises/A+规范。

## 二. 实现目标

我们将实现以下功能和方法，使`HYPromise`符合Promises/A+规范：

1. HYPromise构造函数及基本状态
2. resolve和reject方法
3. then方法
4. catch方法
5. finally方法
6. HYPromise.resolve和HYPromise.reject静态方法
7. HYPromise.all和HYPromise.race静态方法
8. 实现Promise.allSettled和Promise.any静态方法





## 三. 实现过程

### 第1步：定义HYPromise构造函数，并实现基本的状态属性

首先，我们需要创建一个名为`HYPromise`的类，并定义三种状态：pending、fulfilled和rejected。HYPromise类的构造函数将接收一个执行器（executor）函数作为参数。执行器函数会立即执行，并接收两个参数：`resolve`和`reject`，它们分别用于将Promise状态从pending更改为fulfilled或rejected。

我们还需要在类中实现状态的改变以及状态改变时对应的值（value）或原因（reason）的存储。

下面是HYPromise类的基本结构以及构造函数的实现：

```javascript
class HYPromise {
  constructor(executor) {
    // 初始化状态为pending
    this.status = 'pending';
    // 初始化成功的值为undefined
    this.value = undefined;
    // 初始化失败的原因为undefined
    this.reason = undefined;

    // 定义resolve方法
    const resolve = (value) => {
      // 只有在pending状态才能更改状态和值
      if (this.status === 'pending') {
        this.status = 'fulfilled';
        this.value = value;
      }
    };

    // 定义reject方法
    const reject = (reason) => {
      // 只有在pending状态才能更改状态和原因
      if (this.status === 'pending') {
        this.status = 'rejected';
        this.reason = reason;
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
}
```



在这一步中，我们定义了HYPromise类的基本结构，并实现了构造函数以及状态属性的初始化。我们还定义了`resolve`和`reject`方法，并在执行器函数中使用它们。如果执行器函数抛出异常，我们会捕获它并将Promise状态更改为rejected。



### 第2步：实现resolve和reject两个核心方法

接下来，我们需要在HYPromise类中实现两个核心方法：`resolve`和`reject`。这两个方法用于处理异步操作的结果。我们会将这两个方法从构造函数中提取出来，并作为类的实例方法。同时，我们需要处理异步操作的结果，将成功或失败的处理函数存储在队列中，在`resolve`或`reject`方法中逐个执行这些处理函数。

下面是HYPromise类的实现：

```javascript
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
}
```



在这一步中，我们实现了`resolve`和`reject`方法。当Promise状态从pending变为fulfilled或rejected时，我们将执行相应的处理函数队列中的函数。此外，我们还对构造函数中的异常处理进行了优化。



### 第3步：实现then方法

接下来，我们需要在HYPromise类中实现`then`方法。`then`方法用于为Promise实例注册成功和失败的处理函数。它返回一个新的Promise实例，以便我们可以链式调用。

为了符合Promises/A+规范，我们需要实现一个名为`resolvePromise`的辅助函数。这个函数用于处理`then`方法返回的新Promise实例以及它们的成功和失败处理函数的结果。

首先，我们实现`resolvePromise`辅助函数：

```javascript
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
```



接下来，我们在HYPromise类中实现`then`方法：

```js
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
```



### 第4步：实现catch方法

catch方法是一个语法糖，它等价于调用then方法时仅传入一个失败处理函数。我们需要在HYPromise类中实现这个方法。

下面是HYPromise类的catch方法实现：

```javascript
class HYPromise {
  // ...其他代码

  catch(onRejected) {
    // 调用then方法，仅传入失败处理函数
    return this.then(null, onRejected);
  }
}
```

在这一步中，我们实现了`catch`方法。它只接受一个参数：`onRejected`，这个参数是失败的处理函数。我们通过调用`then`方法并传入`null`作为成功处理函数来实现这个方法。



### 第5步：实现finally方法

finally方法也是一个语法糖，它用于在Promise实例上注册一个处理函数，无论Promise是成功还是失败，该处理函数都会被调用。我们需要在HYPromise类中实现这个方法。

下面是HYPromise类的finally方法实现：

```javascript
class HYPromise {
  // ...其他代码

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
}
```

在这一步中，我们实现了`finally`方法。它接受一个参数：`callback`，这个参数是一个处理函数。无论Promise实例成功还是失败，这个处理函数都会被调用。我们通过调用`then`方法并传入两个相同的处理函数来实现这个方法。这两个处理函数分别用于成功和失败的情况，它们都会返回一个新的Promise实例，以确保`callback`是异步执行的。





### 第6步：实现Promise.resolve和Promise.reject静态方法

接下来，我们需要在HYPromise类中实现两个静态方法：`resolve`和`reject`。这两个方法可以快速地创建一个已经解决或拒绝的Promise实例。

下面是HYPromise类的resolve和reject静态方法实现：

```javascript
class HYPromise {
  // ...其他代码

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
}
```

在这一步中，我们实现了`resolve`和`reject`静态方法。`resolve`方法接受一个参数：`value`，用于创建一个已经解决的Promise实例。`reject`方法接受一个参数：`reason`，用于创建一个已经拒绝的Promise实例。



### 第7步：实现Promise.all和Promise.race静态方法

最后，我们需要在HYPromise类中实现两个静态方法：`all`和`race`。`all`方法用于将多个Promise实例包装成一个新的Promise实例，只有当所有的Promise实例都成功时，新的Promise实例才会成功；`race`方法则是将多个Promise实例包装成一个新的Promise实例，只要其中一个Promise实例成功或失败，新的Promise实例就会立即成功或失败。

下面是HYPromise类的all和race静态方法实现：

```javascript
class HYPromise {
  // ...其他代码

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
}
```



在这一步中，我们实现了`all`和`race`静态方法。`all`方法接受一个数组参数，该数组包含多个Promise实例。我们遍历这个数组，使用`HYPromise.resolve`将每个实例包装成一个标准的Promise实例。当所有实例都解决时，我们将结果数组传递给新的Promise实例的`resolve`方法。`race`方法的实现类似，我们遍历输入数组，当任何一个实例解决或拒绝时，立即调用新的Promise实例的`resolve`或`reject`方法。



### 第8步：实现Promise.allSettled和Promise.any静态方法

接下来，我们需要在HYPromise类中实现两个额外的静态方法：`allSettled`和`any`。`allSettled`方法用于将多个Promise实例包装成一个新的Promise实例，只要所有的Promise实例都完成（成功或失败），新的Promise实例就会成功；`any`方法则是将多个Promise实例包装成一个新的Promise实例，只要其中一个Promise实例成功，新的Promise实例就会立即成功。如果所有实例都失败，新的Promise实例将失败。

下面是HYPromise类的allSettled和any静态方法实现：

```javascript
class HYPromise {
  // ...其他代码

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
```

在这一步中，我们实现了`allSettled`和`any`静态方法。`allSettled`方法接受一个数组参数，该数组包含多个Promise实例。我们遍历这个数组，使用`HYPromise.resolve`将每个实例包装成一个标准的Promise实例。当所有实例都完成（成功或失败）时，我们将结果数组传递给新的Promise实例的`resolve`方法。`any`方法的实现类似，我们遍历输入数组，当任何一个实例解决时，立即调用新的Promise实例的`resolve`方法。当所有实例都拒绝时，我们将错误数组传递给新的Promise实例的`reject`方法。



## 四. Promises/A+ 测试

在实现完我们的HYPromise之后，我们需要通过Promises/A+的测试来验证我们的实现是否正确。Promises/A+提供了一组测试用例，我们可以用这些测试用例来确保我们的HYPromise满足Promises/A+规范。

### 第1步：安装Promises/A+测试库

首先，我们需要安装Promises/A+的测试库。在项目目录下运行以下命令：

```bash
npm init
npm install --save-dev promises-aplus-tests
```

这将在项目中安装`promises-aplus-tests`库。

### 第2步：编写测试适配器

接下来，我们需要编写一个适配器文件，以便`promises-aplus-tests`库能够测试我们的HYPromise实现。在项目目录下创建一个名为`adapter.js`的文件，然后在其中添加以下代码：

```javascript
const HYPromise = require('./HYPromise'); // 导入我们实现的HYPromise模块

// 暴露适配器对象
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
  }
};
```

这个适配器文件导出了一个对象，其中包含了`resolved`、`rejected`和`deferred`方法。这些方法分别对应HYPromise的`resolve`、`reject`方法和一个返回延迟对象（包含一个新的Promise实例以及对应的resolve和reject方法）的函数。

### 第3步：运行测试

在项目目录下创建一个名为`test.js`的文件，然后在其中添加以下代码：

```javascript
const promisesAplusTests = require('promises-aplus-tests');
const adapter = require('./adapter');

promisesAplusTests(adapter, function (err) {
  if (err) {
    console.error('Promises/A+ 测试失败:');
    console.error(err);
  } else {
    console.log('Promises/A+ 测试通过');
  }
});
```

这个文件导入了`promises-aplus-tests`库和我们编写的适配器。然后，我们调用`promisesAplusTests`函数，传入适配器对象和一个回调函数。如果测试通过，我们会在控制台输出“Promises/A+ 测试通过”，否则会输出错误信息。

最后，运行以下命令执行测试：

```bash
node test.js
```

如果我们的HYPromise实现正确，我们应该看到“Promises/A+ 测试通过”的输出。如果测试失败，我们需要根据错误信息修改我们的HYPromise实现，然后重新运行测试，直到所有测试都通过。

至此，我们已经成功地对我们的HYPromise实现进行了Promises/A+测试。

