// // 1. 端侧适配器：统一Web/小程序API差异
// const Adapter = {
//   // 本地缓存适配
//   storage: {
//     get(key) {
//       // 小程序环境判断（以微信小程序为例）
//       if (typeof wx !== 'undefined') {
//         return wx.getStorageSync(key) || '[]';
//       }
//       // Web环境
//       return localStorage.getItem(key) || '[]';
//     },
//     set(key, value) {
//       if (typeof wx !== 'undefined') {
//         wx.setStorageSync(key, value);
//       } else {
//         localStorage.setItem(key, value);
//       }
//     }
//   },

//   // 网络请求适配
//   request: (url, data) => {
//     return new Promise((resolve, reject) => {
//       if (typeof wx !== 'undefined') {
//         // 小程序请求：控制并发（简化版，实际需加请求池）
//         wx.request({
//           url,
//           method: 'POST',
//           data,
//           header: { 'Content-Type': 'application/json' },
//           success: res => res.statusCode === 200 ? resolve() : reject(),
//           fail: reject
//         });
//       } else {
//         // Web请求：优先用sendBeacon，失败降级fetch
//         if (navigator.sendBeacon && new Blob([JSON.stringify(data)]).size <= 60 * 1024) {
//           resolve(navigator.sendBeacon(url, JSON.stringify(data)));
//         } else {
//           fetch(url, {
//             method: 'POST',
//             body: JSON.stringify(data),
//             keepalive: true
//           }).then(res => res.ok ? resolve() : reject()).catch(reject);
//         }
//       }
//     });
//   },

//   // 空闲执行适配
//   idleCallback: (cb) => {
//     if (typeof wx !== 'undefined') {
//       wx.nextTick(cb); // 小程序用nextTick
//     } else if (window.requestIdleCallback) {
//       window.requestIdleCallback(cb); // Web用空闲回调
//     } else {
//       setTimeout(cb, 0); // 降级
//     }
//   },

//   // 网络状态适配
//   getNetworkType: () => {
//     return new Promise(resolve => {
//       if (typeof wx !== 'undefined') {
//         wx.getNetworkType({
//           success: res => resolve(res.networkType) // 如2g/3g/4g/5g
//         });
//       } else if (navigator.connection) {
//         resolve(navigator.connection.effectiveType);
//       } else {
//         resolve('unknown');
//       }
//     });
//   }
// };

// // 2. 核心SDK类
// class TrackSDK {
//   constructor(config = {}) {
//     this.config = {
//       reportUrl: '/api/analytics/track', // 上报地址
//       batchSize: 10, // 默认批量阈值
//       retryMax: 3, // 最大重试次数
//       storageKey: 'track_events', // 缓存key
//       ...config
//     };
//     this.queue = JSON.parse(Adapter.storage.get(this.config.storageKey)); // 从缓存恢复队列
//     this.isReporting = false; // 防止重复上报锁
//     this.init();
//   }

//   // 初始化：启动批量上报调度
//   init() {
//     // 监听页面卸载，触发最后一次上报
//     if (typeof window !== 'undefined') {
//       window.addEventListener('beforeunload', () => this.report(true));
//     }
//     // 空闲时处理队列
//     Adapter.idleCallback(() => this.checkAndReport());
//   }

//   // 1. 埋点事件入队
//   track(eventName, properties = {}) {
//     // 构造标准事件格式（含用户/设备标识，实际需补充userId/deviceId逻辑）
//     const event = {
//       eventName,
//       properties: {
//         url: typeof window !== 'undefined' ? window.location.href : '',
//         timestamp: Date.now(),
//         ...properties
//       },
//       retryCount: 0, // 重试次数
//       sign: this.generateSign(event) // 签名防篡改（简化版，实际需动态密钥）
//     };

//     // 入队并缓存
//     this.queue.push(event);
//     Adapter.storage.set(this.config.storageKey, JSON.stringify(this.queue));
//     // 检查是否触发批量上报
//     this.checkAndReport();
//   }

//   // 2. 生成事件签名（防篡改）
//   generateSign(event) {
//     const signStr = `${event.eventName}-${event.properties.timestamp}-${this.config.secretKey || 'default_key'}`;
//     // 简化版SHA256（实际需用CryptoJS等库）
//     return btoa(signStr);
//   }

//   // 3. 检查队列是否满足上报条件
//   async checkAndReport() {
//     // 获取网络状态，动态调整批量阈值
//     const networkType = await Adapter.getNetworkType();
//     const realBatchSize = networkType.includes('2g') ? 5 : this.config.batchSize;

//     // 满足条件：队列长度达标 或 强制上报（页面卸载）
//     if (this.queue.length >= realBatchSize || (arguments[0] && this.queue.length > 0)) {
//       await this.report();
//     }
//   }

//   // 4. 核心上报逻辑（含重试）
//   async report() {
//     if (this.isReporting || this.queue.length === 0) return;

//     this.isReporting = true;
//     // 取出当前批次（浅拷贝，避免修改原队列）
//     const batch = [...this.queue.splice(0, this.config.batchSize)];

//     try {
//       // 调用适配器发送请求
//       await Adapter.request(this.config.reportUrl, { events: batch });
//       // 上报成功：更新缓存（移除已成功的批次）
//       Adapter.storage.set(this.config.storageKey, JSON.stringify(this.queue));
//     } catch (err) {
//       // 上报失败：重试次数+1，放回队列尾部
//       const retryBatch = batch.map(item => ({ ...item, retryCount: item.retryCount + 1 }))
//         .filter(item => item.retryCount <= this.config.retryMax); // 过滤超重试上限的事件
//       this.queue.push(...retryBatch);
//       Adapter.storage.set(this.config.storageKey, JSON.stringify(this.queue));
//     } finally {
//       this.isReporting = false;
//       // 若还有剩余事件，继续上报
//       if (this.queue.length > 0) {
//         Adapter.idleCallback(() => this.checkAndReport());
//       }
//     }
//   }
// }

// // 3. 实例化（业务方调用示例）
// // Web端：
// // const track = new TrackSDK({ reportUrl: 'https://xxx.com/api/track', secretKey: 'web_key' });
// // track.track('button_click', { btnId: 'submit' });

// // 小程序端：
// // const track = new TrackSDK({ reportUrl: 'https://xxx.com/api/track', secretKey: 'mini_key' });
// // track.track('page_view', { pagePath: '/pages/index' });


class TrackSDK {
  constructor(reportUrl, secretKey) {
    this.reportUrl = reportUrl;
    this.secretKey = secretKey;
    this.dataList = [];
  }

  track(options) {
    // 收集
    this.dataList.push(options)
  }
}