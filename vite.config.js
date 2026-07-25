import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' + HashRouter = GitHub Pages'te repo adından bağımsız çalışır
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    strictPort: true,
  },
})
