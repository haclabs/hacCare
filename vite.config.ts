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
        // Manual chunk splitting for better caching and smaller initial load
        manualChunks(id) {
          // Vendor chunks - group by library
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Put react-query in the main vendor chunk to ensure it loads first
            // This prevents "i is not a constructor" errors from race conditions
            if (id.includes('lucide-react') || id.includes('clsx') || id.includes('class-variance-authority')) {
              return 'vendor-ui';
            }
            if (id.includes('date-fns') || id.includes('uuid') || id.includes('dompurify')) {
              return 'vendor-utils';
            }
            // All other node_modules (including @tanstack/react-query) go to vendor
            return 'vendor';
          }
          
          // Feature-based chunks - group by feature
          if (id.includes('src/features/patients')) {
            return 'feature-patients';
          }
          if (id.includes('src/features/clinical')) {
            return 'feature-clinical';
          }
          if (id.includes('src/features/admin')) {
            return 'feature-admin';
          }
          if (id.includes('src/features/simulation')) {
            return 'feature-simulation';
          }
          
          // Services and utilities
          if (id.includes('src/services')) {
            return 'services';
          }
          if (id.includes('src/lib')) {
            return 'lib';
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