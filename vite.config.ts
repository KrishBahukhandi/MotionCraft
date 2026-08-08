import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      // Vendor splitting applies to the browser bundle only — in the SSR build
      // used for prerendering, react and friends are external.
      output: isSsrBuild
        ? {}
        : {
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom'],
              motion: ['framer-motion'],
            },
          },
    },
  },
}))
