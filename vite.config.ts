import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        login: resolve(__dirname, 'public/login.html'),
        register: resolve(__dirname, 'public/register.html'),
        'admin-dashboard': resolve(__dirname, 'public/admin-dashboard.html'),
        'employee-dashboard': resolve(__dirname, 'public/employee-dashboard.html'),
        'collaborator-dashboard': resolve(__dirname, 'public/collaborator-dashboard.html'),
        'owner-dashboard': resolve(__dirname, 'public/owner-dashboard.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/client')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
