// function throttle(func, delay) {
//   let lastCall = 0;
//   return function (...args) {
//     const now = new Date().getTime();
//     if (now - lastCall >= delay) {
//       func.apply(this, args);
//       lastCall = now;
//     }
//   };
// }



















function throttle(func, limit) {
  let timer = null;
  return function (...args) {
    if (timer === null) {
      timer = setTimeout(() => {
        func.apply(this, args)
        timer = null;
      }, limit);
    }
  }
}