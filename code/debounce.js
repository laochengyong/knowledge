// function debounce(func, wait) {
//     let timeout;
//     return function() {
//         const context = this;
//         const args = arguments;
//         clearTimeout(timeout);
//         timeout = setTimeout(() => {
//             func.apply(context, args);
//         }, wait);
//     };
// }





function debounce(func, limit) {
  let timer = null;

  return function (...args) {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      func.apply(this, args)
    }, limit);

  }
}

// Test cases
function testDebounce() {
  // Test 1: Function is called only once after rapid successive calls
  let callCount = 0;
  const debouncedFn = debounce((a, b) => { callCount = a + b }, 100);

  debouncedFn(1, 1);
  debouncedFn(1, 1);
  debouncedFn(1, 1);

  setTimeout(() => {
    console.log(callCount);
    // console.assert(callCount === 1, "Test 1 Failed: Function should be called once");
  }, 200);

}

testDebounce()



