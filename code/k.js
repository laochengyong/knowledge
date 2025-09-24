// 单向链表输出倒数第 K 个元素

function findKthToTail(head, k) {

    let slow = head;
    let fast = head;

    for (let i = 0; i < k; i++) {
        fast = fast.next;
    }

    while(fast) {
        slow = slow.next;
        fast = fast.next;
    }

    return slow;
}

class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

// 示例用法
// 创建链表 1->2->3->4->5
const head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(3);
head.next.next.next = new ListNode(4);
head.next.next.next.next = new ListNode(5);

const k = 2;
const result = findKthToTail(head, k);
if (result) {
    console.log(`倒数第 ${k} 个元素是: ${result.val}`); // 输出: 4
} else {
    console.log(`无效的K值: ${k}`);
}