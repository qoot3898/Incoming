import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://qoottemporarylabor.runasp.net';
  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      proxy: { '/api': { target: proxyTarget, changeOrigin: true } },
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
            grid: ['@mui/x-data-grid'],
            // App-shell data/i18n libraries only; zod + react-hook-form are split with the form pages.
            data: ['@tanstack/react-query', 'axios', 'i18next', 'react-i18next'],
            forms: ['zod', 'react-hook-form', '@hookform/resolvers'],
          },
        },
      },
    },
  };
});
