import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls đến backend Python
    proxy: {
      '/detect': 'http://localhost:8000',
      '/classes': 'http://localhost:8000',
    }
  }
})
