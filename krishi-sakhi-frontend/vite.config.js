import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Requests to /api are forwarded to the backend during development, so the
  // browser never needs to know the backend's port.
  const backend = env.VITE_BACKEND_URL || 'http://localhost:3001'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': { target: backend, changeOrigin: true }
      }
    },
    preview: {
      port: 3000,
      proxy: {
        '/api': { target: backend, changeOrigin: true }
      }
    }
  }
})
