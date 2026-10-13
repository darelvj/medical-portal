import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: loadEnv(mode, process.cwd(), '').BACKEND_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}))
