const debounce = (func, delay) => {
    let timer = null;
    return function (...args) {
        if (timer != null) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            func.call(this, ...args)
        }, delay)
    }
}

// test
const array = new Array(100)
const task = (i) => {
    console.log(i);
}
const doubbleTask = debounce(task, 2000)
for (let index = 0; index < array.length; index++) {
    doubbleTask(index)   
}