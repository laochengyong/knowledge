class AsyncTaskManager {
    constructor(limit) {
        this.limit = limit;
        this.running = 0;
        this.taskQueue = [];
    }

    addTask(task) {
        const taskPromise = () => task().then(res => {
            if (this.taskQueue.length > 0) {
                const nextTaskPromise = this.taskQueue.shift()
                nextTaskPromise()
                this.running++
            }
            return res
        }).finally(() => {
            this.running--
        })
        if (this.running < this.limit) {
            taskPromise()
            this.running++
        } else {
            this.taskQueue.push(taskPromise);
        }
    }
}


class AsyncTaskManager {
    constructor(limit) {
        this.limit = limit;
        this.l = 0;
        this.r = 0;
        this.taskQueue = [];
    }

    // 按序
    addTask(task) {
        const taskPromise = () => task().then(res => {
            // 任务完成
        })
        this.taskQueue(taskPromise)

        if (this.r - this.l < this.limit) {
            this.taskQueue[]
        }
    }
}


// test
const sleep = async (time) => {
    return new Promise(resolve => setTimeout(resolve, time))
}

const createTask = (name, time) => {
    return async () => {
        console.log(name, '开始');
        await sleep(time)
        console.log(name, '完成');
    }
}

const task1 = createTask('task1', 1000)
const task2 = createTask('task2', 1000)
const task3 = createTask('task3', 1000)
const task4 = createTask('task4', 1000)
const asyncTaskManager = new AsyncTaskManager(1)
asyncTaskManager.addTask(task1)
asyncTaskManager.addTask(task2)
asyncTaskManager.addTask(task3)
asyncTaskManager.addTask(task4)
