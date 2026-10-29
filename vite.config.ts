import path from 'path'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
            if (id.includes('@tanstack/react-router')) {
              return 'vendor-router'
            }
            if (id.includes('msw') || id.includes('@mswjs')) {
              return 'vendor-msw'
            }
            if (id.includes('socket.io-client') || id.includes('engine.io-client')) {
              return 'vendor-socket'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('zod') || id.includes('axios')) {
              return 'vendor-utils'
            }
          }
        },
      },
    },
  },
})

