# 微前端

## 是什么
  xxx技术手段；
  微前端的一种多个团队独立构建部署子应用共同维护一个大应用的技术手段。

## 为什么
  4个业务核心价值：
    1. 技术无关：vue/react/no webpack的应用都可以整合到一起
    2. 独立构建、部署
    3. 独立运行
    4. 增量升级

## 怎么做
  iframe
  按页面拆分应用
  single-spa
  阿里的：qiankun
  京东的：micro-app
  字节的：garfish
  webpack的：模块联邦

  qiankun原理
  5个技术核心点：
  1. 整合html
    通过import-html-entry插件整合子应用的html。html加载，js、css会不会加载，拷贝html时，会不会把js、css也拷贝过来？
    会加载js、css，但不是简单的拷贝，而是主动请求，通过沙箱隔离加载，同时绑定子应用生命周期钩子，实现控制。
  2. js隔离
    子应用js不会通过script标签注入主应用，而是放在沙箱环境执行。沙箱环境如何实现？同时还能访问到window原生api
    1. 主要原理：用沙箱的代理对象作为替换window作为全局对象global，执行子应用的script
      ```javascript
        src/loader.js 330
        // 用沙箱的代理对象作为接下来使用的全局对象
        global = sandboxContainer.instance.proxy as typeof window;
        
        src/loader.js 347
        const scriptExports: any = await execScripts(global, sandbox && !useLooseSandbox, {
          scopedGlobalVariables: speedySandbox ? cachedGlobals : [],
        });
    ```
    2. 实现沙箱具体流程：
      1. 初始化proxy对象（构造函数）：
        1. 创建fakeWindow对象（假的window对象）
          将descriper不可配置的属性拷贝到fakeWindow对象
            ** 这里很鸡肋：因为window原生属性中，不可配置的属性只有一部分，可配置也有一部分，所以此时通过fakeWindow访问所有window原生属性是不可行的 **
            而且qiankun中，获取原生window属性不会从fakeWindow获取，都是从window对象直接获取。
            那我们不得不思考将descriper不可配置的属性拷贝到fakeWindow对象作用是什么？
            我觉得作用是：避免子应用在沙箱环境与非沙箱环境运行不一致，引起不必要的麻烦。比如window里的Infinity属性，因为是不可配置属性，
            不可以重新defineProperty，而如果fakeWindow没有设置不可配置对象，在qiankun环境中就可以defineProperty。
        2. 基于fakeWindow对象创建Proxy对象 
        3. 代理方法编写：
          1. set()
            1. 判断sandbox是否是激活状态，激活状态才走沙箱逻辑；否则不做处理，开发环境抛出警告，严格模式抛出错误。
            2. 白名单的属性，直接设置在window下，
            3. 当新增属性时，在window下有时，把window下属性的属性描述拷贝过来
            4. 否则把属性直接放在fakeWindow上
          2. get()
            1. window self globalThis都直接返回proxy
            2. top parent如果当前时iframe内，可以访问window，否则返回proxy
            3. document返回Sandbox对象维护的document
            4. 白名单、不可修改的属性，返回window的属性
            5. 如果属性在fakeWindow存在，则返回fakeWindow内的属性
            6. 如果属性在fakeWindow不存在，则返回window下的属性
            7. 如果是方法：还要通过bind将this重新window。
          3. has()
          4. defindProperty()
          5. deleteProperty()
            1. 如果改属性再fakeWindow下，则删除该属性，否则不处理。
          6. getPrototypeOf()
          7. getOwnPrototypeDescriper()
          8. ownKeys()
      2. 执行script前，将global从window设置成proxy对象。import-html-entry的execScripts执行script支持传入沙箱对象、是否开启严格模式
      3. motued时，激活sandbox；unmoted时，失活sandbox，清除副作用，打印存在的全局变量updateValueSet
  3. css隔离
    1. Shadow Dom(强隔离)
      2个技术要点：
        1. 给容器元素创建Shadow Dom节点
        2. 把子应用Dom与css添加到Shadow Dom节点
      2个优点：
        1. 性能好：浏览器原生支持
        2. 隔离性强
      4个缺点：
        1. 兼容性问题：老旧浏览器不支持Shadow Dom
        2. 样式覆盖：主应用难于覆盖子应用样式，只能通过特定属性:root/css变量--var来控制子应用样式；
        3. 事件处理：Shadow Boundary（影子边界）隔离了主应用与子应用DOM结构，冒泡事件、事件dispatch都会失效，需要额外写转发逻辑。
        4. document.body问题:某些第3方的弹框/下拉菜单添加到document.body下，而不是shadowRoot下，导致样式丢失
    2. Scope 局部作用域(实验性隔离)
      3个技术要点：
        1. 拦截：通过import-html-entry获取子应用的css样式
        2. 改写：给css样式选择器前添加属性选择器div[data-qiankun="subAppName"]
        3. 标记：给子应用根节点添加属性data-qiankun="subAppName"
      3个优点：
        1. 兼容性好，兼容所有浏览器
        2. 主应用能更好地覆盖子应用样式
        3. 挂载的document.body问题少，因为body、html的样式不会被修改
      3个缺点：
        1. 运行时计算问题：子应用渲染时，带来额外改写消耗
        2. 隔离性差：body、html、@开头选择器不支持隔离：注意: @keyframes, @font-face, @import, @page 将不被支持 (i.e. 不会被改写)
        3. 可能由于选择器优先级问题/body样式，导致不可控的样式冲突问题--样式规范
  4. 通讯
    1. 通过props传递
      用法关键点：
        主应用提供：通过registryMicroApp注册子应用时，添加props属性。
        子应用接收：通过mounted、unmounted、update生命周期钩子的第一个参数接收。
      优点：简单
      缺点：只在挂载卸载时能接收新props，子应用独立运行时无法实时监听props
      场景：适合通讯简单，只需要子应用挂载卸载时通讯的场景中。
    2. 通过全局状态initGlobalState(state)管理
      用法关键点：
        qiankun提供的获取全局状态通讯方法的api，建议在主应用使用，子应用通过props获取
          返回3个通讯方法：
            1. 监听全局状态：onGlobalStateChange: (callback, isImmdiate) => void
            2. 更新全局状态：setGlobalSate: (state) => void
            3. 清除该应用全局监听：offGlobalStateChange() => boolean
      优点：实时监听到数据更新、全局通讯
      缺点：用法稍复杂
      场景：适合需要实时通讯场景
    3. 其他（非乾坤支持的）
      1. EventBus 
        1. 自定义EventBus/引入mitt/rxjs库。
        2. 主应用创建唯一的EventBus实例，并挂载到window
        3. 所有应用都可以通过利用EventBus实例通讯
      优点：双向通讯、实时通讯、解耦强
      缺点：引入额外的库、卸载时注意清除
      场景：
      2. window
      用法关键点：
        1. 约定一个命名空间，如microAppData；
        2. 主应用设置，子应用读取/获取调用microAppData方法传递数据给父组件。
      优点：简单
      缺点：无法实时监听；破坏隔离性
      3. localStorage/sessionStorage/cookie等浏览器缓存
      用法关键点：
        1. 任意一个应用调用相关api写入；其他应用读取
        2. localstorage/seesionStorage需要所有应用是同源应用；可以通过加统一代理实现
        3. cookie的domain配置需要覆盖通讯的应用的访问host；
      优点：持久化
      缺点：无法实现监听，只能主动获取；有容量限制localstorage/seesionStorage是5M、cookie是4k；性能差；不支持复杂数据
  5. 生命周期
    1. bootstrap
      时机：子应用首次加载时执行，只执行一次。
      事情：适合做全局初始化操作，比如初始化配置、不会被unmounted清理的全局变量
    2. mounted
      时机：每次路由匹配到时
      事情：DOM渲染、实例创建、定时器初始化
    3. unmoumted
      时机：每次路由切走/卸载时
      事情：DOM卸载、定时器销毁、资源回收
    4. update(可选)
      时机：仅使用 loadMicroApp 方式加载微应用时生效
      事情：监控被loadMicroApp渲染的次数等

## 怎么用
  qiankun
  1. 主应用
    1. 安装qiankun： npm i qiankun -D / <script src="https://unpkg.com/qiankun@2.10.16/dist/index.umd.min.js"></script>
    2. 提供子应用节点：编写主应用布局，提供子应用节点
    3. 注册子应用：通过registryMicroApp({
      name: "子应用名",
      entry: '//hostsname:xxx', // 子应用html入口
      container: '子应用在主应用挂载的节点',
      activeRoot: '激活路径'
    })
    4. 启动，通过start(config: Object)启动，传入配置
  2. 子应用接入(接入流程：整个应用作为子应用接入->规划拆分子应用->开发新子应用->接入新子应用(替换原应用的某个部分))
    1. 在入口文件编写生命周期钩子：(给主应用控制)
    ```javascript
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
      ```
    2. 改写打包配置：(给主应用识别)
    ```javascript
      webpack v5：
      const packageName = require('./package.json').name;

      module.exports = {
        output: {
          library: `${packageName}-[name]`,
          libraryTarget: 'umd',
          chunkLoadingGlobal: `webpackJsonp_${packageName}`,
        },
      };

      // webpack v4
      const packageName = require('./package.json').name;

      module.exports = {
        output: {
          library: `${packageName}-[name]`,
          libraryTarget: 'umd',
          jsonpFunction: `webpackJsonp_${packageName}`,
        },
      };
    ```
## 生态

## 竞品
  1. iframe
    1. 使用
      iframe标签引入子应用
    2. 原理
      通过iframe嵌套网页的功能
    3. 优点
      1. 使用简单
      2. 隔离性好
      3. 兼容性好
    4. 劣点
      总：如果不考虑体验问题，iframe几乎是最完美的微前端方案。
      1. DOM隔离性太强，子应用的组件无法逃离子应用边界，一些全局弹出难以实现。
      2. 性能问题：iframe开独立进程，占内存，加载慢。
      3. iframe的history无法记录，前进后退无法使用。
      4. postMessage通讯，只能传递序列化的字符串，无法传递复杂数据。
    5. 场景
      1. 不考虑性能的简单场景
      2. 不可控的第三方
  2. single-spa
    1. 使用
      主应用安装single-spa，注册子应用；子应用提供生命周期，更改产物输出配置。
    2. 原理
      监听路由，使用import-html-entry主动加载子应用资源，并挂载到预设容器标签中。
    3. 优点
      1. 使用简单
      2. spa应用，体验好
      3. 兼容性好
    4. 劣点
      1. 无隔离
      2. 提供的api少
    5. 场景
      1. 不考虑隔离的简单场景
  3. qiankun(蚂蚁)
        1. 实现
      iframe标签引入子应用
    2. 原理
      通过iframe嵌套网页的功能
    3. 优点
      1. 使用简单
      2. 隔离性好
      3. 兼容性好
    4. 劣点
      总：如果不考虑体验问题，iframe几乎是最完美的微前端方案。
      1. DOM隔离性太强，子应用的组件无法逃离子应用边界，一些全局弹出难以实现。
      2. 性能问题：iframe开独立进程，占内存，加载慢。
      3. iframe的history无法记录，前进后退无法使用。
      4. postMessage通讯，只能传递序列化的字符串，无法传递复杂数据。
    5. 场景
      1. 不考虑性能的简单场景
      2. 不可控的第三方
  4. micro-app(京东)
  5. garfish(字节)
  6. module Federation(webpack)

## 参考文献
1. [qiankun官网](https://qiankun.umijs.org/zh/guide)
2. [微前端qiankun核心原理](https://juejin.cn/post/7496340361352347657)
3. [豆包辅助理解](https://www.doubao.com/thread/web23089cbd1f21c1)
4. [qiankun源码](http://github.com/unijs/qiankun)
5. [single-spa官网](https://zh-hans.single-spa.js.org/docs/microfrontends-concept)
6. [single-spa源码](http://github.com/single-spa/single-spa)
7. [手写single-spa，理解微前端原理](https://zhuanlan.zhihu.com/p/1889260409577518075)
