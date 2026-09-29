import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { builtinModules } from 'node:module'

/** One CommonJS bundle for the extension host; only the `vscode` API stays external. */
export default defineConfig({
  build: {
    ssr: fileURLToPath(new URL('./src/extension.ts', import.meta.url)),
    outDir: fileURLToPath(new URL('./build/extension', import.meta.url)),
    emptyOutDir: false,
    target: 'node20',
    minify: false,
    rollupOptions: {
      external: ['vscode', ...builtinModules, ...builtinModules.map(name => `node:${name}`)],
      output: { format: 'cjs', entryFileNames: 'extension.js' }
    }
  },
  ssr: { noExternal: true, target: 'node' }
})
