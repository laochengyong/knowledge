(function () {
  const { registerMicroApps, start } = window.qiankun;

  registerMicroApps([
    {
      name: 'react-app',
      entry: '//localhost:5500/code/qiankun-demo/react/',
      container: '#react',
      activeRule: '/react'
    },
    {
      name: 'vue-app',
      entry: '//localhost:8000',
      container: '#vue',
      activeRule: '/vue'
    }
  ])

  start()
})()