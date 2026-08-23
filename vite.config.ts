import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    // Push the noisy warning threshold up a touch. The manual chunks below
    // keep every real chunk well under this after gzip.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('/d3-')) return 'charts';
          if (
            id.includes('i18next') ||
            id.includes('react-i18next')
          ) {
            return 'i18n';
          }
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('jspdf')) return 'pdf';
          if (id.includes('react-router')) return 'router';
          if (
            id.includes('react-dom') ||
            (id.includes('/react/') && !id.includes('react-router') && !id.includes('react-i18next'))
          ) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
