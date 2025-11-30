import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer - only in production builds when needed
    ...(process.env.ANALYZE ? [visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })] : [])
  ],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020', // Modern browsers for better optimization
    sourcemap: false, // Disable source maps in production
    minify: 'terser', // Use terser for better minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        // Manual chunking strategy for optimal bundle splitting
        manualChunks: (id) => {
          // Vendor libraries - separate chunk for better caching
          if (id.includes('node_modules')) {
            // React core - most stable, cache-friendly
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // Supabase - frequently updated
            if (id.includes('@supabase') || id.includes('supabase-js')) {
              return 'vendor-supabase';
            }
            // PDF libraries - large, rarely used, separate chunk
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('@react-pdf')) {
              return 'vendor-pdf';
            }
            // TanStack Query - data fetching
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }
            // UI utilities and icons
            if (id.includes('lucide-react') || id.includes('date-fns') || id.includes('dompurify')) {
              return 'vendor-ui';
            }
            // Everything else
            return 'vendor-misc';
          }
          
          // Application code chunking by feature
          // Simulation system - large, separate module
          if (id.includes('/features/simulation/')) {
            return 'feature-simulation';
          }
          // Admin features - separate for role-based access
          if (id.includes('/features/admin/')) {
            return 'feature-admin';
          }
          // Clinical features (vitals, medications, etc.)
          if (id.includes('/features/clinical/')) {
            return 'feature-clinical';
          }
          // Patient management
          if (id.includes('/features/patients/')) {
            return 'feature-patients';
          }
          // hacMap body marking system
          if (id.includes('/features/hacmap/')) {
            return 'feature-hacmap';
          }
          // Settings and documentation
          if (id.includes('/features/settings/') || id.includes('/components/Documentation/') || id.includes('/components/Changelog/')) {
            return 'feature-settings-docs';
          }
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 500, // Warn if chunks exceed 500kb
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: []
  }
})