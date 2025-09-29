// 立即执行函数隔离作用域
(function () {
    // 从全局获取qiankun API
    const { registerMicroApps, start, initGlobalState } = window.qiankun;

    // 初始化全局状态
    const initialState = {
        user: { name: '主应用用户' }
    };
    const actions = initGlobalState(initialState);

    // 监听全局状态变化
    actions.onGlobalStateChange((newState, prev) => {
        console.log('主应用状态变化:', newState, prev);
    });

    // 注册微应用
    registerMicroApps([
        {
            name: 'app1',
            entry: '//localhost:3001', // 微应用1地址
            container: '#micro-app-container',
            activeRule: '/app1',
            props: {
                parentMsg: '来自主应用的消息'
            }
        },
        {
            name: 'app2',
            entry: '//localhost:3002', // 微应用2地址
            container: '#micro-app-container',
            activeRule: '/app2'
        }
    ]);

    // 启动qiankun
    start({
        sandbox: {
            strictStyleIsolation: false,
            experimentalStyleIsolation: true
        }
    });

    // 处理路由
    function handleRouter() {
        const path = window.location.pathname;
        if (path === '/') {
            document.getElementById('micro-app-container').innerHTML =
                '<p>请点击上方链接访问微应用</p>';
        }
    }

    window.addEventListener('popstate', handleRouter);
    handleRouter();
})();
