import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({
    include: '**/*.{jsx,js}',
  })],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    // Split code into smaller chunks — each page loads only what it needs
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — loaded once, cached forever
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase — loaded once, cached forever
          'vendor-supabase': ['@supabase/supabase-js'],
          // Charts — only loaded when user visits Analytics
          'vendor-charts': ['chart.js'],
          // Pages split into logical groups
          'pages-finance': [
            './src/pages/Expenses.jsx',
            './src/pages/Income.jsx',
            './src/pages/Loans.jsx',
            './src/pages/Medical.jsx',
          ],
          'pages-scan': [
            './src/pages/ScanPrices.jsx',
            './src/pages/Voice.jsx',
          ],
          'pages-social': [
            './src/pages/Sharing.jsx',
            './src/pages/Spaces.jsx',
          ],
          'pages-shop': [
            './src/pages/ShoppingList.jsx',
            './src/pages/PriceCompare.jsx',
          ],
        },
      },
    },
    // Raise the warning threshold so we only see warnings for truly huge chunks
    chunkSizeWarningLimit: 600,
  },
})
