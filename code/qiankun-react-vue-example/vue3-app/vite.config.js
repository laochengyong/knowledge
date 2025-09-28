import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3002,
    headers: {
      'Access-Control-Allow-Origin': '*', // 允许跨域
    },
  },
  build: {
    lib: {
      name: 'vue3-app',
      entry: 'src/main.js',
      formats: ['umd'],
    },
  },
});
