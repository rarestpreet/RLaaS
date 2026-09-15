import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8080',
      '/customers': 'http://localhost:8080',
      '/projects': 'http://localhost:8080',
      '/policies': 'http://localhost:8080',
      '/api-keys': 'http://localhost:8080',
      '/v1': 'http://localhost:8080',
      '/test': 'http://localhost:8080',
      '/actuator': 'http://localhost:8080',
    },
  },
})

