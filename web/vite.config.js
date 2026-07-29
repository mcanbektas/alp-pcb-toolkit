import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Kendi sunucumuzda barındırılır (GitHub Pages değil): kök '/'den servis
// edilir, BrowserRouter kullanılır. docs/uyelik-ve-rapor-plani.md §6.2
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5289',
        changeOrigin: true,
      },
    },
  },
})
