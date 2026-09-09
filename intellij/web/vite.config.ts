import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: { dedupe: ['react', 'react-dom', '@milkdown/kit', '@milkdown/crepe'] },
  build: { outDir: '../build/web', emptyOutDir: true, chunkSizeWarningLimit: 2000 }
})
