import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@merkzeug/core'] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@merkzeug/core'] })]
  },
  renderer: {
    plugins: [react()]
  }
})
