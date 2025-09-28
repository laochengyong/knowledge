module.exports = {
  webpack: (config) => {
    // 允许开发环境跨域
    config.devServer = {
      ...config.devServer,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
    
    // 设置库名称
    config.output.library = `react-app`;
    config.output.libraryTarget = 'umd';
    
    return config;
  },
};
