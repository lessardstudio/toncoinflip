import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    // Добавляем полифилы для Node.js в браузере
    nodePolyfills({
      // Указываем, что нам нужен полифил для Buffer
      include: ['buffer', 'process'],
      globals: {
        Buffer: true,
        process: true,
        global: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Отключаем оптимизацию для tonweb, чтобы избежать проблем с Buffer
    exclude: ['tonweb'],
  },
  server: {
    cors: true,
    proxy: {
      // Прокси для tonapi.io
      '/tonapi': {
        target: 'https://tonapi.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tonapi/, '/v1'),
        secure: true
      },
      // Прокси для toncenter mainnet
      '/toncenter': {
        target: 'https://toncenter.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/toncenter/, '/api/v2'),
        secure: true
      },
      // Прокси для toncenter testnet
      '/testnet-toncenter': {
        target: 'https://testnet.toncenter.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/testnet-toncenter/, '/api/v2'),
        secure: true
      }
    }
  },
  define: {
    'process.env': {
      TON_NETWORK: JSON.stringify('testnet'),
      VITE_CONTRACT_ADDRESS: JSON.stringify(process.env.VITE_CONTRACT_ADDRESS || ''),
      VITE_IS_TESTNET: JSON.stringify('true')
    },
    // Для некоторых библиотек нужно явно указать global
    global: 'globalThis',
  }
});
