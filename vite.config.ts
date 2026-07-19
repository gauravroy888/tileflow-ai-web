import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/tileflow-ai-web/' : '/',
  server: {
    port: 5174,
    strictPort: true,
  },
}))
