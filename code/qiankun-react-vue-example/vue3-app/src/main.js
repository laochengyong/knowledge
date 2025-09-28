import { createApp } from 'vue';
import App from './App.vue';
import './index.css';

let app = null;

// 渲染函数
function render(props = {}) {
  const { container } = props;
  app = createApp(App);
  
  // 提供全局状态操作
  app.config.globalProperties.$actions = props.actions;
  
  app.mount(container ? container.querySelector('#app') : '#app');
}

// 独立运行时
if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

// 暴露给qiankun的生命周期
export async function bootstrap() {
  console.log('Vue3子应用 bootstrap');
}

export async function mount(props) {
  console.log('Vue3子应用 mount', props);
  render(props);
}

export async function unmount() {
  console.log('Vue3子应用 unmount');
  app.unmount();
  app = null;
}
