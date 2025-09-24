/**
给你一个由 (、) 和小写字母组成的字符串s。你需要从字符串中删除最少数目的'(' 或者')' （可以删除任意位置的括号)，使得剩下的「括号字符串」有效。
有效「括号字符串」应当符合以下 任意一条 要求：
空字符串或只包含小写字母的字符串
可以被写作 AB（A 连接 B）的字符串，其中 A 和 B 都是有效「括号字符串」
可以被写作 (A) 的字符串，其中 A 是一个有效的「括号字符串」
输入：s = "a)b(c)d"
输出："ab(c)d"
输入：s = "))(("
输出：""
解释：空字符串也是有效的
**/
function removeToValid(s) {
    // TODO
    const stack = []

    for (let i = 0; i < s.length; i++) {
        if (s[i] == '(') {
            stack.push(['(', i])
        } else if (s[i] == ')') {
            if (stack.length - 1 >= 0 && stack[stack.length - 1][0] === '(') {
                stack.pop();
            } else {
                stack.push([')', i]);
            }
        }
    }

    const set = new Set()
    for (let i = 0; i < stack.length; i++) {
        set.add(stack[i][1])
    }

    let ans = ''
    for (let i = 0; i < s.length; i++) {
        if (!set.has(i)) {
            ans += s[i]
        }
    }

    return ans;
}

const res1 =  removeToValid("a)b(c)d")
const res2 =  removeToValid("))(()")
console.log(res1, res2);
