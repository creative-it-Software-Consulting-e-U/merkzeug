import { cpSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), { name: 'bundle-pdf-templates', closeBundle() { cpSync(fileURLToPath(new URL('../resources/pdf-templates', import.meta.url)), fileURLToPath(new URL('./dist/pdf-templates', import.meta.url)), { recursive: true }) } }],
  build: {
    outDir: 'dist',
    target: 'safari16'
  }
})
