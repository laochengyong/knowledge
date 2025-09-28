import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerMicroApps, start, initGlobalState } from 'qiankun';
import App from './App';
import './index.css';

// 初始化全局状态管理
const initialState = {
  user: { name: 'Guest' },
  message: ''
};

const actions = initGlobalState(initialState);

// 监听全局状态变化
actions.onGlobalStateChange((newState, prev) => {
  console.log('主应用监听到 状态变化:', newState, prev);
});

// 注册微应用
registerMicroApps([
  {
    name: 'react-app', // React子应用
    entry: '//localhost:3001',
    container: '#micro-app-container',
    activeRule: '/react-app',
    props: { actions }
  },
  {
    name: 'vue3-app', // Vue3子应用
    entry: '//localhost:3002',
    container: '#micro-app-container',
    activeRule: '/vue3-app',
    props: { actions }
  }
]);

// 启动qiankun
start({
  sandbox: {
    css: true // 开启CSS隔离
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App actions={actions} />
  </React.StrictMode>
);
