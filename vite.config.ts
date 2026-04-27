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
    target: 'es2022', // Modern browsers for better optimization
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
            // Supabase - frequently updated, own chunk
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
            // Everything else in one stable vendor chunk.
            // Keeping react, react-dom, react-router, and their transitive deps
            // (react-big-calendar, prop-types, @restart/*, cookie, uncontrollable, etc.)
            // together prevents circular chunk warnings from cross-importing packages.
            return 'vendor-libs';
          }

          // Shared cross-feature components - must be declared before feature-specific rules.
          // BarcodeGenerator is statically imported by patients AND simulation AND admin,
          // so it cannot belong to any single feature chunk without causing a circular.
          if (id.includes('/features/patients/components/BarcodeGenerator')) {
            return 'feature-shared';
          }

          // Application code: do NOT manually chunk feature folders.
          // These features have too many cross-imports to be safely split without
          // circular chunk warnings. React.lazy route boundaries in App.tsx provide
          // the right code-splitting points automatically.
          // Settings/docs are genuinely self-contained and safe to keep separate.
          if (
            id.includes('/features/settings/') ||
            id.includes('/components/Documentation/') ||
            id.includes('/components/Changelog/')
          ) {
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