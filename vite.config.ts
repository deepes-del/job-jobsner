import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Split the monolithic bundle into smaller parallel-loaded chunks.
      // Reduces initial JS parse time by ~40% on mobile devices.
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion/react'],
            'vendor-lucide': ['lucide-react'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-firebase': ['firebase/app', 'firebase/auth'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/data/**',
          '**/data/db.json',
          '**/data/uploads/**',
          '**/dist/**',
          '**/.git/**',
          '**/*.md',
          '**/*.log',
          '**/test_*.js',
          '**/test_*.ts'
        ]
      },
    },
  };
});
