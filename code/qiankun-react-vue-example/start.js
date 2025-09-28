const { spawn } = require('child_process');
const path = require('path');

// 应用配置
const apps = [
  {
    name: '主应用 (React)',
    command: 'npm',
    args: ['start'],
    cwd: path.join(__dirname, 'main-app'), // 主应用目录
    port: 3000
  },
  {
    name: 'React 子应用',
    command: 'npm',
    args: ['start'],
    cwd: path.join(__dirname, 'react-app'), // React子应用目录
    port: 3001
  },
  {
    name: 'Vue3 子应用',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(__dirname, 'vue3-app'), // Vue3子应用目录
    port: 3002
  }
];

// 启动单个应用
const startApp = (app) => {
  console.log(`🚀 启动 ${app.name}...`);
  
  const child = spawn(app.command, app.args, {
    cwd: app.cwd,
    stdio: 'inherit', // 继承父进程的输入输出
    shell: true
  });

  child.on('error', (err) => {
    console.error(`❌ ${app.name} 启动失败:`, err);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${app.name} 已退出，退出码: ${code}`);
    } else {
      console.log(`✅ ${app.name} 已正常退出`);
    }
  });

  return child;
};

// 启动所有应用
const children = apps.map(app => startApp(app));

// 监听父进程退出，关闭所有子进程
process.on('exit', () => {
  console.log('\n📝 正在关闭所有应用...');
  children.forEach(child => child.kill());
});

// 处理 Ctrl+C 中断
process.on('SIGINT', () => {
  process.exit();
});
