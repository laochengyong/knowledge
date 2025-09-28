# 微前端

## 是什么
  xxx技术手段；

## 为什么
有4个核心价值：
    1. 
    2. 
    3. 
    4. 

## 怎么做
  qiankun原理
  5个核心点：
  1. 整合html
    通过import-html-entry插件整合子应用的html。html加载，js、css会不会加载，拷贝html时，会不会把js、css也拷贝过来？
    会加载js、css，但不是简单的拷贝，而是主动请求，通过沙箱隔离加载，同时绑定子应用生命周期钩子，实现控制。
  2. js隔离
    子应用js不会通过script标签注入主应用，而是放在沙箱环境执行。沙箱环境如何实现？同时还能访问到window原生api
    1. 通过proxy window对象，提供改写后的window对象给子应用，子应用访问window时，会被proxy到特定的命名空间下（如何计算？？？），修改、删除window对象也是proxy到特定的命名空间下，但访问的属性不存在时，会访问到真实的window对象。此时可能会访问到主应用的自定义属性，所以主应用属性命令时增加特定前缀，在sanbox配置上特定前缀，避免子应用访问到主应用自定义属性。
    2. 实现沙箱具体流程：
      属性：

      构造函数：
      1. 创建fakeWindow对象（假的window对象）
        将descriper不可配置的属性拷贝到fakeWindow对象
          ** 这里很鸡肋：因为window原生属性中，不可配置的属性只有一部分，可配置也有一部分，所以此时通过fakeWindow访问所有window原生属性是不可行的 **
          而且qiankun中，获取原生window属性不会从fakeWindow获取，都是从window对象直接获取。
          那我们不得不思考将descriper不可配置的属性拷贝到fakeWindow对象作用是什么？
          我觉得作用是：避免子应用在沙箱环境与非沙箱环境运行不一致，引起不必要的麻烦。比如window里的Infinity属性，因为是不可配置属性，不可以重新defineProperty，而如果fakeWindow没有设置不可配置对象，在qiankun环境中就可以defineProperty。
      2. 基于fakeWindow对象创建Proxy对象 
      3. 代理方法编写：
        1. set()
          1. 判断sandbox是否是激活状态，激活状态才走沙箱逻辑；否则不做处理，开发环境抛出警告，严格模式抛出错误。
          2. 白名单的属性，直接设置在window下，
          3. 当新增属性时，在window下有时，把window下属性的属性描述拷贝过来
          4. 否则把属性直接放在fakeWindow上
        2. get()
          1. 判断sandbox是否是激活状态，激活状态才走沙箱逻辑；否则不做处理，开发环境抛出警告，严格模式抛出错误。
          2. window self globalThis都直接返回proxy
          3. top parent如果当前时iframe内，可以访问window，否则返回proxy
          4. document返回Sandbox对象维护的document
          5. 白名单、不可修改的属性，返回window的属性
          6. 如果属性在fakeWindow存在，则返回fakeWindow内的属性
          7. 如果是方法：还要通过bind将this重新window。
        3. has()
        4. defindProperty()
        5. deleteProperty()
          1. 
        6. getPrototypeOf()
        7. getOwnPrototypeDescriper()
        8. ownKeys()
      3. 执行script前，将global替换成proxy window对象。import-html-entry的execScripts执行script支持传入沙箱对象、是否开启严格模式。
  3. css隔离
  4. 通讯
  5. 生命周期

## 怎么用
  qiankun
  1. 安装 
  2. 主应用
  3. 子应用接入(接入流程：整个应用作为子应用接入->规划拆分子应用->开发新子应用->接入新子应用(替换原应用的某个部分))

## 生态

## 竞品
  1. iframe
  2. signle-spa
  3. qiankun
  4. micro

## 参考文献
1. [qiankun官网](https://qiankun.umijs.org/zh/guide)
2. [微前端qiankun核心原理](https://juejin.cn/post/7496340361352347657)
3. [豆包辅助理解](https://www.doubao.com/thread/web23089cbd1f21c1)
4. [qiankun源码](http://github.com/unijs/qiankun)
5. [single-spa官网](https://zh-hans.single-spa.js.org/docs/microfrontends-concept)
6. [single-spa源码](http://github.com/single-spa/single-spa)
7. [手写single-spa，理解微前端原理](https://zhuanlan.zhihu.com/p/1889260409577518075)
