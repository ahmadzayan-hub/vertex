import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // The repo root has its own React (Beyond Style UAE's Next.js). Pin
      // every peer import to vertex-platform/node_modules so hooks share the
      // same module instance and useContext doesn't return null.
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, './node_modules/react-dom/client'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
      'react-i18next': path.resolve(__dirname, './node_modules/react-i18next'),
      i18next: path.resolve(__dirname, './node_modules/i18next'),
      'react-router-dom': path.resolve(__dirname, './node_modules/react-router-dom'),
    },
    dedupe: ['react', 'react-dom', 'react-i18next', 'i18next', 'react-router-dom'],
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    // Force vitest to bundle these through vite (respects our aliases) rather
    // than falling back to node's require, which resolves react-dom out of the
    // repo root's node_modules and creates a second React instance.
    server: {
      deps: {
        inline: ['react-dom', 'react', 'react-i18next', 'i18next'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/utils/supabase.ts',
        'src/components/**/*.tsx',
        'src/pages/**/*.tsx',
        'src/services/pdf/**',
      ],
    },
  },
});
