import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy tất cả API calls đến FastAPI backend
      '/detect':  'http://localhost:8000',
      '/classes': 'http://localhost:8000',
      '/':        { target: 'http://localhost:8000', bypass: (req) => req.url !== '/' ? req.url : undefined },
    }
  }
})