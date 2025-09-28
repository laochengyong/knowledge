import { registerMicroApps, start } from 'qiankun';

registerMicroApps([
  {
    name: 'reactApp',
    entry: '//localhost:5500/code/qiankun-demo/react/',
    container: '#micro-app-container',
    activeRule: '/app-react',
  },
  {
    name: 'vueApp',
    entry: '//localhost:8080',
    container: '#micro-app-container',
    activeRule: '/app-vue',
  }
]);
// 启动 qiankun
start();