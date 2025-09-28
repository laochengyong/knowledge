import React, { useState, useEffect } from 'react';

function App({ actions }) {
  const [message, setMessage] = useState('');
  const [localCount, setLocalCount] = useState(0);

  // 监听主应用消息
  useEffect(() => {
    if (actions) {
      // 初始获取状态
      setMessage(actions.getGlobalState()?.message || '');
      
      // 注册状态监听
      const unsubscribe = actions.onGlobalStateChange((state) => {
        setMessage(state.message);
      }, true);

      return () => unsubscribe();
    }
  }, [actions]);

  // 发送消息到主应用
  const sendToMain = (text) => {
    if (actions) {
      actions.setGlobalState({
        ...actions.getGlobalState(),
        message: `来自React子应用: ${text}`
      });
    }
  };

  return (
    <div className="react-app">
      <h2>React 子应用</h2>
      
      <div className="message-section">
        <h3>收到的消息:</h3>
        <p>{message || '暂无消息'}</p>
      </div>
      
      <div className="interaction-section">
        <h3>发送消息到主应用:</h3>
        <input
          type="text"
          placeholder="输入消息..."
          id="reactMessage"
        />
        <button onClick={() => {
          const input = document.getElementById('reactMessage');
          sendToMain(input.value);
          input.value = '';
        }}>
          发送
        </button>
      </div>
      
      <div className="local-state">
        <h3>子应用本地状态:</h3>
        <p>计数: {localCount}</p>
        <button onClick={() => setLocalCount(localCount + 1)}>
          增加计数
        </button>
      </div>
    </div>
  );
}

export default App;
