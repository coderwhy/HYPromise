const promisesAplusTests = require('promises-aplus-tests');
const adapter = require('./adapter');
const HYPromise = require('./HYPromise');

// promisesAplusTests(adapter, function (err) {
//   if (err) {
//     console.error('Promises/A+ 测试失败:');
//     console.error(err);
//   } else {
//     console.log('Promises/A+ 测试通过');
//   }
// });

HYPromise.reject(2).catch(err => {
  console.log(err)
})
