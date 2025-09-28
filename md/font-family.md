# 字体家族

## 是什么
  字体家族简称字体，比如：微软黑体、黑体；在css中为font-family

## 为什么
  字体适应各种场景，让我们的页面更加美观。

## 怎么做
  1. 制字工具->获取6886字模板->写模板->录入模板照片->黑白化处理->过滤杂质->设置字体比例->框选字体图案->其他配置(居中)->导出(ttf/svg/png/json等)
      
        

## 怎么用
  1. 从使用上，分别2种。系统内置/外部字体
    1. 系统内置：font-family: heiti;
    2. 外部字体：
      1. 先下载
      2. 再定义：@font-face { font-famliy: "Alibab", src: url('.../...woff2'), url('.../...woff') }
      3. 再使用
  2. 从字体格式上有5种，其中3中为前端常用的
    1. ttf
      跨平台兼容字体文件，可以压缩，或取字体子集。
    2. woff
      有ttf压缩而来，兼容所有浏览器，包括IE
    3. woff2
      进一步压缩，兼容除IE外的所有浏览器
  3. 字体种类上
    非常丰富，微软黑体、黑体、阿里巴巴、宋体等等

## 生态
  1. font-spider(字蛛)取字体子集。5M->5k(压缩率高)
  2. antd-design中的字体处理：优先使用系统默认的界面字体 -> 利于屏显的备用字体库(兼容性好)
    修改antd-design默认字体有3中方案：
      1. 列举所有用到的组件的类名，写font-family进行覆盖
      2. antd5+定制主题，可以设置fontFamily
      3. antd5+使用css变量，会生成.css-var类，进行覆盖即可


## 竞品对比
  1. 图片
    对于非常复杂丰富的字体，用压缩图片代替。
  2. font-size font-weight
    对于加粗、大字号，可以用font-size、font-weight代替。比如alibaba115号字体可有alibaba55字体加粗而来
  3. 自定义字体

## 参考文档
  1. [如何快速制作个人字体ttf/gfont](https://zhuanlan.zhihu.com/p/577986402)
  2. [antd-design官方字体介绍](https://ant.design/docs/spec/font-cn)
  3. [antd定制主题](https://ant.design/docs/react/customize-theme-cn#theme)
  4. [antd使用css变量](https://ant.design/docs/react/css-variables-cn)
  5. [前端资源优化之【字体子集化】](https://article.juejin.cn/post/7527880790618308662)