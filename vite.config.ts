/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

  // В dev и preview /api проксируется на mock API — так же, как это делает nginx в контейнере
  const proxy = { '/api': { target: env.API_URL || 'http://localhost:8000', changeOrigin: true } };

  return {
    plugins: [react()],
    // antd целиком весит больше дефолтного порога в 500 кБ — для внутреннего десктопного приложения это нормально
    build: { chunkSizeWarningLimit: 1500 },
    server: { port: 3000, proxy },
    preview: { port: 3001, proxy },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      css: false,
    },
  };
});
