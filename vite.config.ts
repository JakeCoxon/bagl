import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  root: 'examples',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'bagl': fileURLToPath(new URL('./src/index.ts', import.meta.url))
    }
  },
  server: {
    port: 3000,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  }
}) 