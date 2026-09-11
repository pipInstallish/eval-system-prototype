import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// served from https://<user>.github.io/eval-system-prototype/ in production
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/eval-system-prototype/' : '/',
  plugins: [react()],
  server: { port: 5181 }
}))
