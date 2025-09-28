import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 独立运行时的渲染
function renderApp(props) {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App {...props} />
    </React.StrictMode>
  );
}

// 暴露生命周期钩子给qiankun
if (window.__POWERED_BY_QIANKUN__) {
  window['react-app'] = {
    bootstrap: async () => console.log('React子应用 bootstrap'),
    mount: async (props) => {
      console.log('React子应用 mount', props);
      renderApp(props);
    },
    unmount: async () => {
      console.log('React子应用 unmount');
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.unmount();
    }
  };
} else {
  // 独立运行
  renderApp({});
}

// 热更新支持
if (module.hot) {
  module.hot.accept();
}
