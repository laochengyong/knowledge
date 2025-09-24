function reduce(func, initVal) {

    if (!this instanceof Array) {
        throw new Error()
    }

    let previous = initVal ?  initVal : this[0];

    let index = initVal ? 0 : 1;

    for (; index < this.length; index++) {
       previous = func(previous, this[index], this, index)
    }

    return previous;
}


Array.prototype.__reduce = reduce;

const arr = [1,2,3,4]

const result = arr.reduce((previous, current, list, index) => {
    const result = previous + current;
    return result;
})
const __result = arr.__reduce((previous, current, list, index) => {
    const result = previous + current;
    return result;
})

console.log(result, __result)
// reduce((previous, current, list, index) => {

//     return result;
// }, initVal)