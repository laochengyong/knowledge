// function reverseNodeList(root) {
//   // 1 -> 2 -> 3 -> 4 -> 5
//   // 1(pre) <- 2(cur)    3(next)
//   if (root == null || root.next == null) {
//     return root;
//   }
//   if (root.next.next == null) {
//     root.next.next = root;
//     root.next = null;
//     return
//   }
//   let pre = root;
//   let cur = root.next;
//   let next = root.next.next;
//   while (next) {
//     pre.next = null;
//     next = cur.next;
//     cur.next = pre;
//     cur = next;
//   }

//   return cur;
// }
function reverseNodeList(head) {
  // 1 2 3 4
  // -<1(prev) 2(curr)
  let prev = null
  let curr = head;
  while (curr) {
    const nextTemp = curr.next;
    curr.next = prev;
    prev = curr;
    curr = nextTemp;
  }
  return prev;
}

class NodeList {
  constructor(val) {
    this.val = val;
    this.next = null;
  }
}

function addNodeList(l1, l2) {
  const _l1 = reverseNodeList(l1)
  const _l2 = reverseNodeList(l2)

  let cur1 = _l1;
  let cur2 = _l2;
  let addNum = 0;
  const dummy = new NodeList(0);
  let cur3 = dummy;
  while (cur1 || cur2 || addNum) {
    const sum = (cur1?.val || 0) + (cur2?.val || 0) + addNum
    let newNode = new NodeList(sum % 10);
    cur3.next = newNode;
    cur3 = cur3.next;
    addNum = Math.floor(sum / 10);
    if (cur1) {
      cur1 = cur1.next;
    }

    if (cur2) {
      cur2 = cur2.next;
    }
  }

  const _l3 = dummy.next;
  const l3 = reverseNodeList(_l3)
  return l3
}

function createList(arr) {
  if (!arr.length) return null;
  const head = new NodeList(arr[0]);
  let current = head;
  for (let i = 1; i < arr.length; i++) {
    current.next = new NodeList(arr[i]);
    current = current.next;
  }
  return head;
}

function listToArray(head) {
  const result = [];
  let current = head;
  while (current) {
    result.push(current.val);
    current = current.next;
  }
  return result;
}

// Test cases
const test1 = () => {
  const l1 = createList([1, 2, 3]);
  const l2 = createList([4, 5, 6]);
  const result = addNodeList(l1, l2);
  console.log(listToArray(result)); // Expected: [5, 7, 9]
};

const test2 = () => {
  const l1 = createList([9, 9, 9]);
  const l2 = createList([1]);
  const result = addNodeList(l1, l2);
  console.log(listToArray(result)); // Expected: [1, 0, 0, 0]
};

const test3 = () => {
  const l1 = createList([0]);
  const l2 = createList([0]);
  const result = addNodeList(l1, l2);
  console.log(listToArray(result)); // Expected: [0]
};

const test4 = () => {
  const l1 = createList([5]);
  const l2 = createList([5]);
  const result = addNodeList(l1, l2);
  console.log(listToArray(result)); // Expected: [1, 0]
};

const test5 = () => {
  const l1 = createList([1, 8]);
  const l2 = createList([0]);
  const result = addNodeList(l1, l2);
  console.log(listToArray(result)); // Expected: [1, 8]
};

test1();
test2();
test3();
test4();
test5();

