// 在全局作用域声明变量
let globalVar = { value: 10 };
function globalFunction() {
    return '这是一个全局函数';
}

// 从根对象（global）可以访问全局变量和函数
console.log(global.globalVar); 
console.log(global.globalFunction()); 

// 模拟一个局部作用域内创建的对象，且没有从根对象可达的引用
function localScope() {
    let localObj = { localData: '局部数据' };
    // 这里 localObj 仅在 localScope 函数内部可达，函数执行完毕后，从根对象不可达
}
localScope();
// 此时 localObj 可能会在垃圾回收时被当作垃圾处理，因为从根对象无法访问到它