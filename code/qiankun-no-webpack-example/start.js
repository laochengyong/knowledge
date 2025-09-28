const { exec } = require('child_process');

// 启动主应用（8080端口）
exec('cd main-app && http-server -p 8080 --cors', (err) => {
  if (err) console.error('主应用启动失败:', err);
  else console.log('主应用启动成功：http://localhost:8080');
});

// 启动微应用1（3001端口）
exec('cd micro-app1 && http-server -p 3001 --cors', (err) => {
  if (err) console.error('微应用1启动失败:', err);
  else console.log('微应用1启动成功：http://localhost:3001');
});

// 启动微应用2（3002端口）
exec('cd micro-app2 && http-server -p 3002 --cors', (err) => {
  if (err) console.error('微应用2启动失败:', err);
  else console.log('微应用2启动成功：http://localhost:3002');
});
