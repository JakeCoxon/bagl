import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'bagl',
      fileName: 'bagl',
      formats: ['es']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        exports: 'named'
      }
    },
    outDir: 'dist',
    sourcemap: true
  }
}); 