import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';

function App({ actions }) {
  const [globalState, setGlobalState] = useState({});
  const location = useLocation();

  // 获取全局状态
  useEffect(() => {
    if (actions) {
      setGlobalState(actions.getGlobalState() || {});
      
      // 监听状态变化
      actions.onGlobalStateChange((state) => {
        setGlobalState(state);
      }, true);
    }
  }, [actions]);

  // 发送消息到子应用
  const sendMessage = (msg) => {
    if (actions) {
      actions.setGlobalState({
        ...actions.getGlobalState(),
        message: msg
      });
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>React主应用</h1>
        <nav>
          <Link to="/">首页</Link>
          <Link to="/react-app">React子应用</Link>
          <Link to="/vue3-app">Vue3子应用</Link>
        </nav>
        <div className="user-info">
          当前用户: {globalState.user?.name}
        </div>
      </header>

      <main>
        {location.pathname === '/' ? (
          <div className="home-page">
            <h2>主应用首页</h2>
            <div className="message-input">
              <input
                type="text"
                placeholder="输入消息发送给子应用"
                id="mainMessage"
              />
              <button onClick={() => {
                const input = document.getElementById('mainMessage');
                sendMessage(input.value);
                input.value = '';
              }}>
                发送消息
              </button>
            </div>
          </div>
        ) : (
          <div id="micro-app-container" className="micro-app-container" />
        )}
      </main>

      <footer>
        微前端示例 © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export default App;
