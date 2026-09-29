import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  base: './',
  resolve: { alias: process.env.VITE_MERKZEUG_TOURS === 'disabled' ? { '@merkzeug/editor/GuidedTour': fileURLToPath(new URL('./src/UnavailableTour.tsx', import.meta.url)) } : {}, dedupe: ['react', 'react-dom', '@milkdown/kit', '@milkdown/crepe'] },
  build: { outDir: '../build/extension/web', emptyOutDir: true, chunkSizeWarningLimit: 2000 }
})
