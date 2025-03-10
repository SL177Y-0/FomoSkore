import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    open: true,
    cors: true,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: true
    }
  },
  resolve: {
    alias: {
      // This provides polyfills for Node.js built-ins
      buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      }
    }
  }
})