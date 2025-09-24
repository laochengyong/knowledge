const thothle = (func, delay) => {
    let timer = null
    let result = undefined;
    return function (...args) {
        if (timer == null) {
            timer = setTimeout(() => {
                timer = null
            }, delay)
            result = func.call(this, ...args)
        }
        return result
    }
}

// test
const array = new Array(3)
const task = (i) => {
    console.log(i);
    return `end ${i}`
}
const doubbleTask = thothle(task, 2000)
for (let index = 0; index < array.length; index++) {
    const res = doubbleTask(index)   
    console.log(res);
    
}

// function throttle(func, delay) {
//     let timer = null;
//     let previous = 0;
//     let result;

//     return function (...args) {
//         const now = Date.now();
//         const remaining = delay - (now - previous);

//         if (remaining <= 0 || remaining > delay) {
//             if (timer) {
//                 clearTimeout(timer);
//                 timer = null;
//             }
//             result = func.apply(this, args);
//             previous = now;
//         } else if (!timer) {
//             timer = setTimeout(() => {
//                 previous = Date.now();
//                 timer = null;
//                 result = func.apply(this, args);
//             }, remaining);
//         }
//         return result;
//     };
// }

// // 使用示例
// function add(a, b) {
//     console.log('Calculating result...');
//     return a + b;
// }

// const throttledAdd = throttle(add, 1000);

// // 模拟频繁调用
// const results = [];
// for (let i = 0; i < 5; i++) {
//     const result = throttledAdd(i, i + 1);
//     results.push(result);
// }
// console.log('Results:', results);
    