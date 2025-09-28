// class LURCache {
//   // obj
//   // 链表
//   constructor(capatity) {
//     this.capatity = capatity;
//     this.obj = {}
//     this.last = { prev: null, next: null, value: -1 };
//   }

//   put(key, value) {
//     if (this.obj[key]) {
//       this.obj[key].value = value
//       this.obj.prev.next = this.obj.next;
//       this.last.next = this.obj;
//       this.last = this.obj;
//     } else {
//       this.obj[key] = {
//         prev: this.last,
//         next: null,
//         value
//       };
//       this.obj[key].prev.next = this.obj[key]
//       this.last = this.obj;
//     }
//   }

//   get(key) {
//     if (this.obj[key]) {
//       // 移到最后
//       this.obj.prev.next = this.obj.next;
//       this.last.next = this.obj;
//       this.last = this.obj;
//       return this.obj[key]
//     } else {
//       return -1;
//     }
//   }
// }

// const cache = new LURCache(2)

// cache.put(1, 1)
// // console.log(cache.obj);
// cache.put(2, 2)
// console.log(JSON.stringify(cache.obj, null, 2));
// cache.put(3, 3)
// // console.log(cache.obj);
// console.log(cache.get(1));
// console.log(cache.get(2));
// console.log(cache.get(3));

class DLinkedNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = {};
    this.head = {
      key: 0,
      value: 0,
      prev: null,
      next: null
    }
    this.tail = {
      key: 0,
      value: 0,
      prev: null,
      next: null
    }
    this.head.next = this.tail;
    this.tail.prev = this.head
  }

  moveTail(key) {
    // 先删-》后加
    this.map[key].prev.next = this.map[key].next;
    this.map[key].next.prev = this.map[key].prev;
    // 后加
    this.map[key].prev = this.tail.prev;
    this.tail.prev.next = this.map[key];
    this.tail.prev = this.map[key]
    this.map[key].next = this.tail;
  }

  deleteHead(key) {
    this.head.next.next.prev = this.head;
    this.head.next = this.head.next.next;
    delete this.map[key]
  }

  addTail(key, value) {
    const newNode = {
      key,
      value,
      prev: this.tail.prev,
      next: this.tail,
    }

    this.map[key] = newNode;
    this.tail.prev.next = newNode;
    this.tail.prev = newNode;
  }


  put(key, value) {
    // 存在-》改值-》把value移动到最后
    // 不存在-》是否删（超出、从前面删）-》在最后增加
    if (this.map[key]) {
      this.map[key].value = value;
      this.moveTail(key)
    } else {
      while (Object.keys(this.map).length >= this.capacity) {
        this.deleteHead(this.head.next.key)
      }
      this.addTail(key, value)
    }
  }

  get(key) {
    // 存在 -》把value移动到最后
    if (this.map[key]) {
      this.moveTail(key)
      return this.map[key].value
    } else {
      return -1;
    }
  }
}


const cache = new LRUCache(2);
cache.put(1, 1);
cache.put(2, 2);
console.log(cache.get(1)); // 输出 1
cache.put(3, 3);
console.log(cache.get(2)); // 输出 -1
cache.put(4, 4);
console.log(cache.get(1)); // 输出 -1
console.log(cache.get(3)); // 输出 3
console.log(cache.get(4)); // 输出 4

