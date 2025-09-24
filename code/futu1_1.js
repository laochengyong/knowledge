// 模拟实现loadash中的_.get()函数，实现如下传入参数取值效果
const parse = (str) => {
    // 'selector.to.futu', 'target[0]'
    const newStr = str.replace(']', '').replace('[', '.');
    const arr = newStr.split('.');
    return arr;
}

// ['traget', '0']
const _get = (obj, argArr, i) => {
    if (obj === undefined) {
        return undefined;
    }

    if (argArr.length == i + 1) {
        return obj[argArr[i]]
    }
    // obj
    // obj.target
    const cur = obj[argArr[i]];
    console.log(cur, 'cur')

    return _get(cur, argArr, i + 1);
}

function get(obj,...arg) {
    // 请补全函数参数和实现逻辑
    // 校验
    if (typeof obj !== 'object') {
        throw new Error('格式不对')
    }
    arg.forEach(item => {
        if (typeof item !== 'string') {
            throw new Error('格式不对')
        }
    })
    // 循环解析
    const newArgs = arg.map(item => parse(item))
    console.log(newArgs, 'newArgs')
    // 循环取值
    const res = newArgs.map(argArr => _get(obj, argArr, 0))

    return res;
}
const obj = {
    selector: {
        to: { futu: 'FE coder' }
    },
    target: [
      1,
      2,
      {
        name: 'futu'
      }
    ]
};

// 运行代码 . []
const result = get(obj, 'selector.to.futu', 'target[0]', 'target[2].name', 'a.b.c')

console.log(result);
//  输出结果：
// ['FE coder', 1, 'futu', undefined]