Promise.__all = (list) => {
  return new Promise((resolve, reject) => {
    const resList = [];
    let count = 0;
    list.forEach((promise, index) => {
      promise.then(res => {
        resList[index] = res
        count++;
        if (count == list.length) {
          resolve(resList)
        }
      }).catch(reject)
    })
  })
}

const promise = async (isSuccess) => {
  return new Promise((resolve, reject) => {
    if (isSuccess) {
      resolve(isSuccess)
    } else {
      reject(0)
    }
  })
}

(async () => {
  try {
    const __result = await Promise.__all([promise(2), promise(1)])
    console.log(__result);
  } catch (error) {
    console.log(error);
  }

  try {
    const result = await Promise.all([promise(2), promise(1)])
    console.log(result);
  } catch (error) {
    console.log(error);
  }


})()
