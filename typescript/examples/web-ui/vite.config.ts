import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import path from 'node:path'

// Ensure .env.local is loaded for vite config process.env access
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Allow overriding backend API port via BACKEND_PORT or PORT env vars
const apiPort = Number(process.env.BACKEND_PORT || process.env.PORT || 5178)

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls in dev to the Express server so the client can call /api/*
      '/api': {
        // Keep this in sync with server/index.ts BASE_PORT or set BACKEND_PORT/PORT before running
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
