import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: { alias: process.env.VITE_MERKZEUG_TOURS === 'disabled' ? { '@merkzeug/editor/GuidedTour': fileURLToPath(new URL('./src/UnavailableTour.tsx', import.meta.url)) } : {}, dedupe: ['react', 'react-dom', '@milkdown/kit', '@milkdown/crepe'] },
  build: { outDir: '../build/web', emptyOutDir: true, chunkSizeWarningLimit: 2000 }
})
