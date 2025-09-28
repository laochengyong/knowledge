// 微应用2生命周期
window['app2'] = {
    bootstrap: async () => {
        console.log('微应用2 bootstrap');
    },
    mount: async (props) => {
        console.log('微应用2 mount', props);
        
        // 监听主应用状态
        props.onGlobalStateChange((state) => {
            console.log('微应用2收到状态:', state);
        }, true);
    },
    unmount: async () => {
        console.log('微应用2 unmount');
    }
};

// 支持独立运行
if (!window.__POWERED_BY_QIANKUN__) {
    window['app2'].mount({});
}
    