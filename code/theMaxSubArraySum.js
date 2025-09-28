/**
 * 求解最大子数组和问题（Maximum Subarray Problem）
 *
 * 题目描述：给定一个整数数组 nums，找到一个具有最大和的连续子数组（子数组最少包含一个元素），
 * 返回其最大和。
 *
 * 示例：
 * 输入：nums = [-2,1,-3,4,-1,2,1,-5,4]
 * 输出：6
 * 解释：连续子数组 [4,-1,2,1] 的和最大，为 6。
 *
 * 算法思路：使用Kadane算法，时间复杂度O(n)，空间复杂度O(1)
 * 1. 初始化当前和currentSum和最大和maxSum为数组第一个元素
 * 2. 从第二个元素开始遍历数组：
 *    - 对于当前元素，决定是将其加入当前子数组，还是以其作为新子数组的起点
 *    - 更新currentSum为nums[i]和currentSum + nums[i]中的较大值
 *    - 比较并更新maxSum
 * 3. 返回maxSum
 */
function maxSubArray(nums) {
  // 用第一个元素初始化maxSum和currentSum
  let maxSum = nums[0];
  let currentSum = nums[0];

  // 从第二个元素开始遍历数组
  for (let i = 1; i < nums.length; i++) {
    // Kadane算法核心：决定是否扩展当前子数组或开始新子数组
    // nums[i]单独作为子数组 vs nums[i]加入当前子数组
    // 选择更大的值作为新的currentSum
    currentSum = Math.max(nums[i], currentSum + nums[i]);

    // 更新全局最大和：
    // 比较当前子数组和(currentSum)与历史最大和(maxSum)
    // 确保始终记录遍历过程中出现的最大和
    maxSum = Math.max(maxSum, currentSum);
  }

  // 返回最大子数组和
  return maxSum;
}

// function __maxSybArray(nums) {
//   if (nums.length == 0) {
//     return 0;
//   }
//   if (nums.length == 1) {
//     return nums[0];
//   }

//   const dp = [nums[0]];
//   let max = dp[0];

//   for (let i = 1; i < nums.length; i++) {
//     dp[i] = Math.max(nums[i], nums[i] + dp[i - 1]);
//     max = Math.max(dp[i], max);
//   }

//   return max;
// }

function __maxSybArray(nums) {
  if (nums.length == 0) {
    return 0;
  }
  if (nums.length == 1) {
    return nums[0];
  }

  let previousValue = nums[0];
  let max = previousValue;

  for (let i = 1; i < nums.length; i++) {
    previousValue = Math.max(nums[i], nums[i] + previousValue);
    max = Math.max(previousValue, max);
  }

  return max;
}

// 测试用例
console.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4])); // 6
console.log(maxSubArray([1])); // 1
console.log(maxSubArray([5, 4, -1, 7, 8])); // 23
console.log(maxSubArray([-1, -2, -3, -4])); // -1
console.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4, 3])); // 7

console.log(__maxSybArray([-2, 1, -3, 4, -1, 2, 1, -5, 4])); // 6
console.log(__maxSybArray([1])); // 1
console.log(__maxSybArray([5, 4, -1, 7, 8])); // 23
console.log(__maxSybArray([-1, -2, -3, -4])); // -1
console.log(__maxSybArray([-2, 1, -3, 4, -1, 2, 1, -5, 4, 3])); // 7
