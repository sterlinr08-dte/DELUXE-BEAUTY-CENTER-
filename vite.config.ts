import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Rutas relativas para que funcione en GitHub Pages bajo cualquier subcarpeta
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // React/router y el cliente de Supabase se usan en TODAS las páginas (no se
        // benefician del split por ruta de App.tsx) — separados en su propio chunk
        // para que el navegador los cachee aparte del código de la app, que cambia
        // más seguido con cada deploy.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
