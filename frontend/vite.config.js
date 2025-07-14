import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        Connection: 'keep-alive'
      },
       '/static': {
        target: 'http://localhost:5000', // 你的Flask后端地址
        changeOrigin: true,
        Connection: 'keep-alive'
      }
    }
  }
})