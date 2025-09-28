// 微应用必须暴露生命周期函数
window['app1'] = {
    // 初始化
    bootstrap: async (props) => {
        console.log('微应用1 bootstrap', props);
    },
    // 挂载
    mount: async (props) => {
        console.log('微应用1 mount', props);
        
        // 显示主应用传递的参数
        document.getElementById('msg').textContent = 
            `收到主应用消息: ${props.parentMsg}`;
        
        // 保存全局状态通信方法
        window.mainActions = props.onGlobalStateChange;
        
        // 监听主应用状态变化
        props.onGlobalStateChange((state) => {
            console.log('微应用1收到主应用状态:', state);
        }, true);
    },
    // 卸载
    unmount: async (props) => {
        console.log('微应用1 unmount', props);
        document.getElementById('msg').textContent = '';
    }
};

// 向主应用发送消息
function sendToMain() {
    if (window.mainActions) {
        // 修改全局状态
        window.mainActions({
            user: { name: '微应用1修改后的用户' }
        });
    }
}

// 支持直接访问微应用
if (!window.__POWERED_BY_QIANKUN__) {
    window['app1'].mount({
        parentMsg: '直接访问微应用1'
    });
}
    