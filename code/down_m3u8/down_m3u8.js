#!/usr/bin/env node

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const http = require('http');
const https = require('https');
const readline = require('readline');
const { performance } = require('perf_hooks');

// 全局配置
const CONFIG = {
    DEFAULT_THREADS: 5,
    DEFAULT_RETRIES: 30,
    TIMEOUT: 30000, // 30秒超时
    STATE_SAVE_INTERVAL: 3000, // 3秒保存一次状态
    MIN_SEGMENT_SIZE: 1024, // 1KB，小于此值视为损坏文件
};

// 工具函数 - 路径处理
const PathUtils = {
    /**
     * 基于URL生成临时目录路径
     * @param {string} m3u8Url - M3U8文件URL
     * @returns {string} 临时目录路径
     */
    getTempDirFromUrl(m3u8Url) {
        const hash = crypto.createHash('md5').update(m3u8Url).digest('hex').substring(0, 10);
        return path.join(process.cwd(), `m3u8_cache_${hash}`);
    },

    /**
     * 根据参数生成输出文件夹路径
     * @param {Object} options - 命令行参数
     * @returns {string} 输出文件夹路径
     */
    getOutputFolder(options) {
        if (options.outputFolder) {
            return path.resolve(options.outputFolder);
        }
        
        if (options.output && fs.existsSync(options.output) && fs.lstatSync(options.output).isDirectory()) {
            return path.resolve(options.output);
        }
        
        return process.cwd();
    },

    /**
     * 从URL提取或生成唯一文件名
     * @param {string} m3u8Url - M3U8文件URL
     * @param {string} ext - 文件扩展名，默认mp4
     * @returns {string} 文件名
     */
    generateOutputFileName(m3u8Url, ext = 'mp4') {
        try {
            const parsedUrl = new URL(m3u8Url);
            let fileName = path.basename(parsedUrl.pathname, '.m3u8');
            
            if (!fileName) {
                fileName = `video_${Date.now()}`;
            }
            
            return `${fileName}.${ext}`;
        } catch (e) {
            return `video_${Date.now()}.${ext}`;
        }
    },

    /**
     * 将相对路径转换为完整URL
     * @param {string} baseUrl - 基础URL
     * @param {string} relativePath - 相对路径
     * @returns {string} 完整URL
     */
    getFullUrl(baseUrl, relativePath) {
        if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            return relativePath;
        }
        
        return new URL(relativePath, baseUrl).href;
    }
};

// 工具函数 - 格式化工具
const FormatUtils = {
    /**
     * 毫秒转换为时分秒格式
     * @param {number} ms - 毫秒数
     * @returns {string} 格式化后的时间字符串
     */
    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    },

    /**
     * 字节转换为B/KB/MB/GB
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的大小字符串
     */
    formatSize(bytes) {
        if (bytes < 1024) return `${bytes.toFixed(2)} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    },

    /**
     * 根据进度生成可视化进度条
     * @param {number} progress - 进度（0-1）
     * @param {number} length - 进度条长度
     * @returns {string} 进度条字符串
     */
    createProgressBar(progress, length = 50) {
        const filled = Math.round(progress * length);
        const empty = length - filled;
        return `[${'='.repeat(filled)}${' '.repeat(empty)}]`;
    }
};

// 工具函数 - 文件操作
const FileUtils = {
    /**
     * 保存状态到JSON文件
     * @param {string} tempDir - 临时目录
     * @param {Object} state - 状态对象
     * @returns {Promise<void>}
     */
    async saveState(tempDir, state) {
        const statePath = path.join(tempDir, 'download_state.json');
        const stateWithTimestamp = {
            ...state,
            timestamp: Date.now()
        };
        
        try {
            await fsPromises.writeFile(
                statePath,
                JSON.stringify(stateWithTimestamp, null, 2),
                'utf8'
            );
        } catch (e) {
            console.error(`\n保存状态失败: ${e.message}`);
        }
    },

    /**
     * 从JSON文件加载状态
     * @param {string} tempDir - 临时目录
     * @returns {Promise<Object|null>} 状态对象或null
     */
    async loadState(tempDir) {
        const statePath = path.join(tempDir, 'download_state.json');
        
        try {
            await fsPromises.access(statePath);
            const data = await fsPromises.readFile(statePath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            return null;
        }
    },

    /**
     * 检查临时目录中已下载的有效片段
     * @param {string} tempDir - 临时目录
     * @param {Array} segments - 片段列表
     * @returns {Promise<Array>} 更新后的片段列表
     */
    async checkDownloadedSegments(tempDir, segments) {
        const segmentsDir = path.join(tempDir, 'segments');
        
        try {
            await fsPromises.access(segmentsDir);
            const files = await fsPromises.readdir(segmentsDir);
            
            return segments.map(segment => {
                const segmentFile = path.join(segmentsDir, `${segment.index}.ts`);
                if (files.includes(`${segment.index}.ts`)) {
                    try {
                        const stats = fs.statSync(segmentFile);
                        if (stats.size >= CONFIG.MIN_SEGMENT_SIZE) {
                            return {
                                ...segment,
                                downloaded: true,
                                size: stats.size
                            };
                        }
                    } catch (e) {
                        // 文件存在但无法访问，视为未下载
                    }
                }
                return segment;
            });
        } catch (e) {
            // 片段目录不存在，返回原始列表
            return segments;
        }
    }
};

// 网络请求工具
class HttpUtils {
    /**
     * 发送HTTP/HTTPS请求
     * @param {string} urlStr - 请求URL
     * @param {Object} options - 请求选项
     * @param {number} retries - 重试次数
     * @returns {Promise<{data: Buffer, statusCode: number}>} 响应数据和状态码
     */
    static async request(urlStr, options = {}, retries = 0) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(urlStr);
            const module = parsedUrl.protocol === 'https:' ? https : http;
            
            const reqOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: options.timeout || CONFIG.TIMEOUT,
                ...options
            };
            
            const req = module.request(reqOptions, (res) => {
                // 处理重定向
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const redirectUrl = PathUtils.getFullUrl(urlStr, res.headers.location);
                    if (retries > 0) {
                        HttpUtils.request(redirectUrl, options, retries - 1)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        reject(new Error(`达到最大重定向次数: ${urlStr}`));
                    }
                    return;
                }
                
                const data = [];
                res.on('data', (chunk) => data.push(chunk));
                res.on('end', () => {
                    resolve({
                        data: Buffer.concat(data),
                        statusCode: res.statusCode
                    });
                });
            });
            
            req.on('error', (err) => reject(err));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`请求超时: ${urlStr}`));
            });
            
            if (options.body) {
                req.write(options.body);
            }
            req.end();
        });
    }

    /**
     * 下载文件到指定路径
     * @param {string} urlStr - 文件URL
     * @param {string} filePath - 保存路径
     * @param {Object} options - 请求选项
     * @returns {Promise<{size: number, statusCode: number}>} 文件大小和状态码
     */
    static async downloadFile(urlStr, filePath, options = {}) {
        const dir = path.dirname(filePath);
        await fsPromises.mkdir(dir, { recursive: true });
        
        const tempFilePath = `${filePath}.part`;
        const fileHandle = await fsPromises.open(tempFilePath, 'w');
        
        try {
            const { data, statusCode } = await HttpUtils.request(urlStr, options);
            await fileHandle.write(data);
            await fileHandle.close();
            await fsPromises.rename(tempFilePath, filePath);
            
            return {
                size: data.length,
                statusCode
            };
        } catch (e) {
            await fileHandle.close().catch(() => {});
            await fsPromises.unlink(tempFilePath).catch(() => {});
            throw e;
        }
    }
}

// M3U8解析器
class M3U8Parser {
    /**
     * 解析M3U8内容
     * @param {string} content - M3U8文件内容
     * @param {string} baseUrl - 基础URL
     * @returns {Object} 解析结果
     */
    static parse(content, baseUrl) {
        const lines = content.split('\n').map(line => line.trim());
        
        // 验证M3U8文件合法性
        if (lines[0] !== '#EXTM3U') {
            throw new Error('无效的M3U8文件，必须以#EXTM3U开头');
        }
        
        const result = {
            segments: [],
            key: null,
            totalDuration: 0,
            targetDuration: 0
        };
        
        let currentSegment = null;
        
        for (const line of lines) {
            if (line.startsWith('#EXT-X-TARGETDURATION:')) {
                result.targetDuration = parseFloat(line.split(':')[1]);
            } else if (line.startsWith('#EXTINF:')) {
                // 解析片段时长
                const duration = parseFloat(line.split(':')[1].split(',')[0]);
                result.totalDuration += duration;
                currentSegment = {
                    duration,
                    url: null,
                    index: result.segments.length,
                    downloaded: false,
                    size: 0,
                    retries: 0,
                    error: null
                };
            } else if (line.startsWith('#EXT-X-KEY:')) {
                // 解析加密信息
                result.key = M3U8Parser.parseKey(line, baseUrl);
            } else if (!line.startsWith('#') && line && currentSegment) {
                // 解析片段URL
                currentSegment.url = PathUtils.getFullUrl(baseUrl, line);
                result.segments.push(currentSegment);
                currentSegment = null;
            }
        }
        
        return result;
    }

    /**
     * 解析加密密钥信息
     * @param {string} keyLine - #EXT-X-KEY行内容
     * @param {string} baseUrl - 基础URL
     * @returns {Object|null} 密钥信息
     */
    static parseKey(keyLine, baseUrl) {
        const keyParts = keyLine.split(',')
            .map(part => part.trim())
            .reduce((obj, part) => {
                const [key, value] = part.split('=').map(p => p.trim());
                obj[key] = value.replace(/"/g, '');
                return obj;
            }, {});
        
        if (keyParts.METHOD === 'NONE') {
            return null;
        }
        
        return {
            method: keyParts.METHOD,
            uri: keyParts.URI ? PathUtils.getFullUrl(baseUrl, keyParts.URI) : null,
            iv: keyParts.IV ? Buffer.from(keyParts.IV.replace('0x', ''), 'hex') : null
        };
    }
}

// 解密工具
class DecryptUtils {
    /**
     * 解密AES加密的TS片段
     * @param {Buffer} data - 加密数据
     * @param {Buffer} key - 密钥
     * @param {Buffer} iv - 初始化向量
     * @returns {Buffer} 解密后的数据
     */
    static decryptAES(data, key, iv) {
        if (key.length !== 16) {
            throw new Error(`无效的AES密钥长度: ${key.length}字节，必须为16字节`);
        }
        
        // 如果IV未提供，使用16字节的空缓冲区
        const finalIv = iv || Buffer.alloc(16, 0);
        
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, finalIv);
        return Buffer.concat([decipher.update(data), decipher.final()]);
    }
}

// 下载工作线程
function workerThread() {
    const { segment, tempDir, key, retries } = workerData;
    const segmentsDir = path.join(tempDir, 'segments');
    const segmentPath = path.join(segmentsDir, `${segment.index}.ts`);
    
    async function downloadAndDecrypt() {
        try {
            // 下载片段
            const { size } = await HttpUtils.downloadFile(
                segment.url,
                segmentPath,
                { timeout: CONFIG.TIMEOUT }
            );
            
            // 如果需要解密
            if (key && key.method === 'AES-128') {
                // 读取下载的文件
                const encryptedData = await fsPromises.readFile(segmentPath);
                
                // 解密
                const decryptedData = DecryptUtils.decryptAES(
                    encryptedData,
                    key.data,
                    key.iv || Buffer.alloc(16, 0)
                );
                
                // 保存解密后的数据
                await fsPromises.writeFile(segmentPath, decryptedData);
            }
            
            return {
                success: true,
                index: segment.index,
                size
            };
        } catch (e) {
            return {
                success: false,
                index: segment.index,
                error: e.message
            };
        }
    }
    
    // 执行下载并发送结果
    downloadAndDecrypt().then(result => {
        parentPort.postMessage(result);
    }).catch(error => {
        parentPort.postMessage({
            success: false,
            index: segment.index,
            error: error.message
        });
    });
}

// 下载管理器
class DownloadManager {
    constructor(options) {
        this.options = options;
        this.state = null;
        this.tempDir = '';
        this.key = null;
        this.keyPath = '';
        this.startTime = 0;
        this.lastDownloadedCount = 0;
        this.lastTimestamp = 0;
        this.downloadSpeed = 0;
        this.stateSaveInterval = null;
        this.workers = new Map();
        this.consoleInterval = null;
        this.downloadedBytesHistory = [];
    }

    /**
     * 初始化新下载
     */
    async initNewDownload() {
        this.startTime = performance.now();
        this.lastTimestamp = this.startTime;
        
        // 创建临时目录
        this.tempDir = PathUtils.getTempDirFromUrl(this.options.url);
        await fsPromises.mkdir(this.tempDir, { recursive: true });
        await fsPromises.mkdir(path.join(this.tempDir, 'segments'), { recursive: true });
        
        // 下载并解析M3U8文件
        console.log(`正在下载并解析M3U8文件: ${this.options.url}`);
        const { data } = await HttpUtils.request(this.options.url);
        const m3u8Content = data.toString('utf8');
        const parsedData = M3U8Parser.parse(m3u8Content, this.options.url);
        
        // 下载密钥（如果需要）
        if (parsedData.key && parsedData.key.uri) {
            await this.downloadKey(parsedData.key);
        }
        
        // 检查已下载的片段（如果有）
        const segments = await FileUtils.checkDownloadedSegments(this.tempDir, parsedData.segments);
        
        // 初始化状态
        this.state = {
            m3u8Url: this.options.url,
            outputPath: this.getOutputPath(),
            segments,
            key: parsedData.key ? {
                method: parsedData.key.method,
                uri: parsedData.key.uri,
                iv: parsedData.key.iv ? parsedData.key.iv.toString('hex') : null
            } : null,
            totalDuration: parsedData.totalDuration,
            lastMergeIndex: -1,
            estimatedTotalSize: 0,
            downloadedSize: segments.reduce((sum, seg) => sum + (seg.downloaded ? seg.size : 0), 0),
            totalSegments: segments.length,
            downloadedSegments: segments.filter(seg => seg.downloaded).length,
            failedSegments: 0,
            startTime: this.startTime
        };
        
        // 保存初始状态
        await FileUtils.saveState(this.tempDir, this.state);
        
        // 设置定期保存状态
        this.stateSaveInterval = setInterval(
            () => FileUtils.saveState(this.tempDir, this.state),
            CONFIG.STATE_SAVE_INTERVAL
        );
        
        // 设置控制台更新
        this.consoleInterval = setInterval(() => this.updateConsole(), 1000);
        
        return this;
    }

    /**
     * 初始化续传
     */
    async initResume() {
        this.tempDir = this.options.resume;
        this.startTime = performance.now();
        this.lastTimestamp = this.startTime;
        
        // 加载状态
        console.log(`正在加载状态文件: ${this.tempDir}`);
        const loadedState = await FileUtils.loadState(this.tempDir);
        
        if (!loadedState) {
            throw new Error(`在目录 ${this.tempDir} 中未找到状态文件`);
        }
        
        this.state = loadedState;
        
        // 验证M3U8文件
        console.log(`正在验证M3U8文件: ${this.state.m3u8Url}`);
        const { data } = await HttpUtils.request(this.state.m3u8Url);
        const m3u8Content = data.toString('utf8');
        const parsedData = M3U8Parser.parse(m3u8Content, this.state.m3u8Url);
        
        // 检查片段数量是否一致
        if (parsedData.segments.length !== this.state.segments.length) {
            throw new Error(`M3U8文件已更改，无法续传。原片段数: ${this.state.segments.length}, 新片段数: ${parsedData.segments.length}`);
        }
        
        // 下载密钥（如果需要）
        if (this.state.key && this.state.key.uri) {
            await this.downloadKey({
                method: this.state.key.method,
                uri: this.state.key.uri,
                iv: this.state.key.iv ? Buffer.from(this.state.key.iv, 'hex') : null
            });
        }
        
        // 检查已下载的片段
        this.state.segments = await FileUtils.checkDownloadedSegments(this.tempDir, this.state.segments);
        this.state.downloadedSegments = this.state.segments.filter(seg => seg.downloaded).length;
        this.state.downloadedSize = this.state.segments.reduce((sum, seg) => sum + (seg.downloaded ? seg.size : 0), 0);
        
        // 如果需要强制合并，重置最后合并索引
        if (this.options.forceMerge) {
            this.state.lastMergeIndex = -1;
        } else {
            // 合并已下载的片段
            await this.mergeSegments(true);
        }
        
        // 保存状态
        await FileUtils.saveState(this.tempDir, this.state);
        
        // 设置定期保存状态
        this.stateSaveInterval = setInterval(
            () => FileUtils.saveState(this.tempDir, this.state),
            CONFIG.STATE_SAVE_INTERVAL
        );
        
        // 设置控制台更新
        this.consoleInterval = setInterval(() => this.updateConsole(), 1000);
        
        return this;
    }

    /**
     * 下载密钥
     * @param {Object} keyInfo - 密钥信息
     */
    async downloadKey(keyInfo) {
        this.key = { ...keyInfo };
        this.keyPath = path.join(this.tempDir, 'key.bin');
        
        try {
            // 检查密钥是否已下载
            await fsPromises.access(this.keyPath);
            this.key.data = await fsPromises.readFile(this.keyPath);
            console.log('已加载缓存的密钥');
        } catch (e) {
            // 下载密钥
            console.log(`正在下载密钥: ${keyInfo.uri}`);
            const { data, statusCode } = await HttpUtils.request(keyInfo.uri);
            
            if (statusCode !== 200) {
                throw new Error(`下载密钥失败，状态码: ${statusCode}`);
            }
            
            this.key.data = data;
            await fsPromises.writeFile(this.keyPath, data);
            console.log('密钥下载完成');
        }
    }

    /**
     * 获取输出文件路径
     * @returns {string} 输出文件路径
     */
    getOutputPath() {
        if (this.options.output) {
            const outputPath = path.resolve(this.options.output);
            const outputDir = PathUtils.getOutputFolder(this.options);
            
            // 检查是否为目录
            if (fs.existsSync(outputPath) && fs.lstatSync(outputPath).isDirectory()) {
                const fileName = PathUtils.generateOutputFileName(this.options.url);
                return path.join(outputPath, fileName);
            }
            
            // 检查是否有扩展名
            if (path.extname(outputPath)) {
                return outputPath;
            }
            
            // 添加默认扩展名
            return `${outputPath}.mp4`;
        }
        
        // 生成默认输出路径
        const outputDir = PathUtils.getOutputFolder(this.options);
        const fileName = PathUtils.generateOutputFileName(this.options.url);
        return path.join(outputDir, fileName);
    }

    /**
     * 开始下载
     */
    async startDownload() {
        console.log(`开始下载，共 ${this.state.totalSegments} 个片段，使用 ${this.options.threads} 个线程`);
        
        // 获取未下载的片段
        const segmentsToDownload = this.state.segments
            .filter(seg => !seg.downloaded && seg.retries < this.options.retries)
            .sort((a, b) => a.index - b.index);
        
        if (segmentsToDownload.length === 0) {
            console.log('所有片段已下载，准备合并...');
            await this.finalizeDownload();
            return;
        }
        
        // 分配工作线程
        const maxThreads = Math.min(this.options.threads, segmentsToDownload.length);
        
        for (let i = 0; i < maxThreads; i++) {
            this.startWorker(segmentsToDownload);
        }
    }

    /**
     * 启动工作线程
     * @param {Array} segmentsToDownload - 待下载片段列表
     */
    startWorker(segmentsToDownload) {
        // 找到下一个需要下载的片段
        const nextSegment = segmentsToDownload.find(seg => 
            !seg.downloaded && seg.retries < this.options.retries && !this.workers.has(seg.index)
        );
        
        if (!nextSegment) {
            // 没有更多片段可下载，检查是否所有工作都已完成
            if (this.workers.size === 0) {
                this.checkDownloadCompletion();
            }
            return;
        }
        
        // 创建工作线程
        this.workers.set(nextSegment.index, true);
        
        const worker = new Worker(__filename, {
            workerData: {
                segment: nextSegment,
                tempDir: this.tempDir,
                key: this.key ? {
                    method: this.key.method,
                    data: this.key.data,
                    iv: this.key.iv
                } : null,
                retries: this.options.retries
            }
        });
        
        // 处理工作线程结果
        worker.on('message', (result) => {
            this.workers.delete(nextSegment.index);
            
            if (result.success) {
                // 更新片段状态
                this.state.segments[result.index].downloaded = true;
                this.state.segments[result.index].size = result.size;
                this.state.segments[result.index].error = null;
                this.state.downloadedSegments++;
                this.state.downloadedSize += result.size;
                
                // 记录下载字节数用于计算速度
                this.downloadedBytesHistory.push({
                    timestamp: performance.now(),
                    bytes: result.size
                });
            } else {
                // 下载失败，增加重试次数
                this.state.segments[result.index].retries++;
                this.state.segments[result.index].error = result.error;
                
                if (this.state.segments[result.index].retries >= this.options.retries) {
                    this.state.failedSegments++;
                    console.error(`\n片段 ${result.index} 达到最大重试次数，下载失败: ${result.error}`);
                }
            }
            
            // 继续下载下一个片段
            this.startWorker(segmentsToDownload);
        });
        
        worker.on('error', (error) => {
            this.workers.delete(nextSegment.index);
            this.state.segments[nextSegment.index].retries++;
            this.state.segments[nextSegment.index].error = error.message;
            
            if (this.state.segments[nextSegment.index].retries >= this.options.retries) {
                this.state.failedSegments++;
                console.error(`\n片段 ${nextSegment.index} 达到最大重试次数，下载失败: ${error.message}`);
            }
            
            // 继续下载下一个片段
            this.startWorker(segmentsToDownload);
        });
    }

    /**
     * 检查下载是否完成
     */
    async checkDownloadCompletion() {
        // 检查是否还有未下载且未达到最大重试次数的片段
        const remainingSegments = this.state.segments.filter(
            seg => !seg.downloaded && seg.retries < this.options.retries
        );
        
        if (remainingSegments.length > 0) {
            // 还有片段需要下载，继续
            console.log(`还有 ${remainingSegments.length} 个片段需要重试下载...`);
            await this.startDownload();
        } else {
            // 下载完成，进行最终处理
            await this.finalizeDownload();
        }
    }

    /**
     * 合并片段
     * @param {boolean} incremental - 是否增量合并
     */
    async mergeSegments(incremental = false) {
        const outputPath = this.state.outputPath;
        const tempOutputPath = path.join(this.tempDir, 'partial_output.ts');
        const segmentsDir = path.join(this.tempDir, 'segments');
        
        // 确定合并范围
        let startIndex = incremental ? this.state.lastMergeIndex + 1 : 0;
        const endIndex = this.state.segments.length - 1;
        
        if (startIndex > endIndex) {
            return; // 没有新片段需要合并
        }
        
        console.log(`正在合并片段 ${startIndex} 到 ${endIndex}...`);
        
        // 打开输出文件（追加模式）
        const flags = incremental && fs.existsSync(tempOutputPath) ? 'a' : 'w';
        const outputFile = await fsPromises.open(tempOutputPath, flags);
        
        try {
            // 按顺序合并片段
            for (let i = startIndex; i <= endIndex; i++) {
                const segment = this.state.segments[i];
                
                // 跳过未下载或损坏的片段
                if (!segment.downloaded) {
                    console.warn(`跳过未下载的片段 ${i}`);
                    continue;
                }
                
                const segmentPath = path.join(segmentsDir, `${i}.ts`);
                
                // 检查文件大小
                try {
                    const stats = await fsPromises.stat(segmentPath);
                    if (stats.size < CONFIG.MIN_SEGMENT_SIZE) {
                        console.warn(`跳过损坏的片段 ${i} (大小: ${stats.size} bytes)`);
                        continue;
                    }
                } catch (e) {
                    console.warn(`跳过不存在的片段 ${i}`);
                    continue;
                }
                
                // 读取并写入片段内容
                const data = await fsPromises.readFile(segmentPath);
                await outputFile.write(data);
                
                // 更新最后合并索引
                this.state.lastMergeIndex = i;
            }
        } finally {
            await outputFile.close();
            // 保存状态
            await FileUtils.saveState(this.tempDir, this.state);
        }
        
        console.log(`合并完成，已合并至片段 ${this.state.lastMergeIndex}`);
    }

    /**
     * 完成下载并处理最终文件
     */
    async finalizeDownload() {
        // 合并所有片段
        await this.mergeSegments(false);
        
        // 重命名临时文件为最终输出文件
        const tempOutputPath = path.join(this.tempDir, 'partial_output.ts');
        const outputPath = this.state.outputPath;
        
        // 确保输出目录存在
        await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
        
        // 如果目标文件已存在，删除它
        if (fs.existsSync(outputPath)) {
            await fsPromises.unlink(outputPath);
        }
        
        // 重命名文件
        await fsPromises.rename(tempOutputPath, outputPath);
        
        // 清理临时文件
        await this.cleanup();
        
        // 输出统计信息
        this.updateConsole(true);
        console.log(`\n下载完成! 文件已保存至: ${outputPath}`);
        console.log(`总大小: ${FormatUtils.formatSize(this.state.downloadedSize)}`);
        console.log(`总耗时: ${FormatUtils.formatTime(performance.now() - this.startTime)}`);
        
        if (this.state.failedSegments > 0) {
            console.warn(`警告: 有 ${this.state.failedSegments} 个片段下载失败，可能影响视频完整性`);
        }
    }

    /**
     * 清理临时文件和目录
     */
    async cleanup() {
        // 清除定时器
        if (this.stateSaveInterval) {
            clearInterval(this.stateSaveInterval);
        }
        
        if (this.consoleInterval) {
            clearInterval(this.consoleInterval);
        }
        
        // 删除临时目录
        try {
            await this.rmdirRecursive(this.tempDir);
        } catch (e) {
            console.warn(`清理临时文件失败: ${e.message}`);
            console.warn(`请手动删除临时目录: ${this.tempDir}`);
        }
    }

    /**
     * 递归删除目录
     * @param {string} dirPath - 目录路径
     */
    async rmdirRecursive(dirPath) {
        const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                await this.rmdirRecursive(fullPath);
            } else {
                await fsPromises.unlink(fullPath);
            }
        }
        
        await fsPromises.rmdir(dirPath);
    }

    /**
     * 更新控制台显示
     * @param {boolean} final - 是否是最终显示
     */
    updateConsole(final = false) {
        const now = performance.now();
        const elapsedTime = now - this.startTime;
        const progress = this.state.totalSegments > 0 
            ? this.state.downloadedSegments / this.state.totalSegments 
            : 0;
        
        // 计算下载速度（只保留最近10秒的数据）
        const tenSecondsAgo = now - 10000;
        this.downloadedBytesHistory = this.downloadedBytesHistory.filter(
            item => item.timestamp >= tenSecondsAgo
        );
        
        let speed = 0;
        if (this.downloadedBytesHistory.length > 0) {
            const totalBytes = this.downloadedBytesHistory.reduce((sum, item) => sum + item.bytes, 0);
            const duration = (now - this.downloadedBytesHistory[0].timestamp) / 1000;
            speed = duration > 0 ? totalBytes / duration : 0;
        }
        
        // 计算平均速度
        const avgSpeed = elapsedTime > 0 ? (this.state.downloadedSize / (elapsedTime / 1000)) : 0;
        
        // 计算预计剩余时间
        const remainingSegments = this.state.totalSegments - this.state.downloadedSegments;
        const estimatedRemainingTime = remainingSegments > 0 && speed > 0
            ? (remainingSegments * (this.state.downloadedSize / this.state.downloadedSegments)) / speed * 1000
            : 0;
        
        // 构建进度条
        const progressBar = FormatUtils.createProgressBar(progress);
        const percent = (progress * 100).toFixed(2);
        
        // 构建状态信息
        const statusLine = [
            progressBar,
            `${percent}%`,
            `已下载: ${this.state.downloadedSegments}/${this.state.totalSegments}`,
            `大小: ${FormatUtils.formatSize(this.state.downloadedSize)}`,
            `速度: ${FormatUtils.formatSize(speed)}/s`,
            `平均: ${FormatUtils.formatSize(avgSpeed)}/s`,
            `用时: ${FormatUtils.formatTime(elapsedTime)}`,
            estimatedRemainingTime > 0 ? `剩余: ${FormatUtils.formatTime(estimatedRemainingTime)}` : ''
        ].filter(Boolean).join(' | ');
        
        // 更新控制台
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(statusLine);
        
        if (final) {
            process.stdout.write('\n');
        }
    }
}

// 解析命令行参数
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        url: null,
        output: null,
        outputFolder: null,
        threads: CONFIG.DEFAULT_THREADS,
        retries: CONFIG.DEFAULT_RETRIES,
        resume: null,
        forceMerge: false
    };
    
    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        
        if (arg === '-o' || arg === '--output') {
            options.output = args[++i];
        } else if (arg === '--output-folder') {
            options.outputFolder = args[++i];
        } else if (arg === '-t' || arg === '--threads') {
            options.threads = parseInt(args[++i], 10) || CONFIG.DEFAULT_THREADS;
        } else if (arg === '-r' || arg === '--retries') {
            options.retries = parseInt(args[++i], 10) || CONFIG.DEFAULT_RETRIES;
        } else if (arg === '--resume') {
            options.resume = args[++i];
        } else if (arg === '--force-merge') {
            options.forceMerge = true;
        } else if (!options.url) {
            options.url = arg;
        } else {
            console.error(`未知参数: ${arg}`);
            printUsage();
            process.exit(1);
        }
        
        i++;
    }
    
    // 验证参数
    if (!options.url && !options.resume) {
        console.error('必须提供M3U8 URL或续传目录');
        printUsage();
        process.exit(1);
    }
    
    // 确保线程数合理
    options.threads = Math.max(1, Math.min(100, options.threads));
    
    return options;
}

// 打印使用说明
function printUsage() {
    console.log('M3U8视频下载器使用说明:');
    console.log('');
    console.log('新下载模式:');
    console.log('  node m3u8-downloader.js <m3u8-url> [选项]');
    console.log('');
    console.log('续传模式:');
    console.log('  node m3u8-downloader.js --resume <临时目录> [--force-merge]');
    console.log('');
    console.log('选项:');
    console.log('  -o, --output       指定输出文件路径或目录');
    console.log('  --output-folder    指定输出文件夹');
    console.log('  -t, --threads      下载线程数，默认5');
    console.log('  -r, --retries      最大重试次数，默认30');
    console.log('  --resume           续传模式，指定临时目录');
    console.log('  --force-merge      强制重新合并所有片段');
    console.log('');
    console.log('示例:');
    console.log('  新下载: node m3u8-downloader.js https://example.com/video.m3u8 -o output.mp4 -t 10');
    console.log('  续传:   node m3u8-downloader.js --resume m3u8_cache_a1b2c3d4e5');
}

// 主函数
async function main() {
    // 如果是工作线程，执行工作线程逻辑
    if (!isMainThread) {
        return workerThread();
    }
    
    try {
        const options = parseArgs();
        const downloadManager = new DownloadManager(options);
        
        // 注册异常处理
        process.on('SIGINT', async () => {
            console.log('\n收到中断信号，正在保存状态...');
            if (downloadManager.state) {
                await FileUtils.saveState(downloadManager.tempDir, downloadManager.state);
            }
            process.exit(1);
        });
        
        process.on('unhandledRejection', async (reason) => {
            console.error('\n未处理的Promise拒绝:', reason);
            if (downloadManager.state) {
                await FileUtils.saveState(downloadManager.tempDir, downloadManager.state);
            }
            process.exit(1);
        });
        
        process.on('uncaughtException', async (error) => {
            console.error('\n未捕获的异常:', error);
            if (downloadManager.state) {
                await FileUtils.saveState(downloadManager.tempDir, downloadManager.state);
            }
            process.exit(1);
        });
        
        // 初始化并开始下载
        if (options.resume) {
            await downloadManager.initResume();
        } else {
            await downloadManager.initNewDownload();
        }
        
        await downloadManager.startDownload();
    } catch (error) {
        console.error(`\n错误: ${error.message}`);
        process.exit(1);
    }
}

// 启动程序
main();
