import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

import { appVersionDefine } from './version.config'

export default defineConfig({
  plugins: [react()],
  define: appVersionDefine,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
