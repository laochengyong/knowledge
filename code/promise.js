

function __Promise(func) {

    this.status = 'pending'

    this.funcList = []
    this.errFuncList = []

    const resolve = (res) => {
        if (this.status == 'pending') {
            this.status = 'fulfilled'
        }
        if (this.status === 'fulfilled') {
            this.res = res

            this.funcList.forEach(func => {
                console.log(111, this.res);
                this.res = func(this.res)
            })
        }

    }

    const reject = (err) => {
        if (this.status == 'pending') {
            this.status = 'rejected'
        }

        if (this.status == 'rejected') {
            this.err = err

            this.errFuncList.forEach(func => {
                this.err = func(this.err)
            })

        }


    }

    func(resolve, reject)

}

__Promise.prototype.then = function (func, errFunc) {
    if (this.status === 'pending') {
        this.funcList.push(func)
        this.errFuncList.push(errFunc)
    } else if (this.status === 'fulfilled') {
        this.res = func(this.res)
    } else if (this.status === 'rejected') {
        this.err = errFunc(this.err)
    }

    return this;
}

new __Promise((resolve, reject) => {

    // setTimeout(() => {
        resolve('fininal')
        reject('fullest')
    // }, 0);

}).then((res => { console.log(res); return 10 }), (err => { })).then(res => { console.log(res) })