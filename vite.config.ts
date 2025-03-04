import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    // Добавляем полифилы для Node.js в браузере
    nodePolyfills({
      // Полифиллы необходимые для TonWeb
      include: [
        'crypto',
        'stream',
        'util',
        'buffer',
        'events',
        'process',
        'string_decoder',
        'assert',
        'path'
      ],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    basicSsl() // Добавляем SSL для работы с TonConnect
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['tonweb'],
    esbuildOptions: {
      target: 'esnext',
    },
    include: ['@tonconnect/sdk', 'tonweb'],
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ton: ['@tonconnect/sdk', 'tonweb'],
        },
      }
    }
  },
  server: {
    cors: true,
    host: true,
    https: {
      key: './localhost-key.pem',
      cert: './localhost.pem'
    },
    port: 5173,
    strictPort: true,
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
      },
      '/api/proxy/transaction': {
        target: process.env.VITE_IS_TESTNET === 'true'
          ? 'https://testnet.toncenter.com'
          : 'https://toncenter.com',
        changeOrigin: true,
        secure: true,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': `${process.env.VITE_TONCENTER_API_KEY}`
        },
        rewrite: (path) => {
          const params = new URLSearchParams(path.split('?')[1] || '');
          const hash = params.get('hash');
          const lt = params.get('lt');
          
          // Формируем URL с обязательными параметрами
          let url = `/api/v2/getTransactions?address=${process.env.VITE_CONTRACT_ADDRESS}&limit=1`;
          
          // Добавляем hash, если он есть (без дополнительного кодирования)
          if (hash) {
            url += `&hash=${hash}`;
          }
          
          // Добавляем lt, если он есть
          if (lt) {
            url += `&lt=${lt}`;
          }
          
          return url;
        },
      },
      '/api/proxy/address': {
        target: process.env.VITE_IS_TESTNET === 'true'
          ? 'https://testnet.toncenter.com'
          : 'https://toncenter.com',
        changeOrigin: true,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': `${process.env.VITE_TONCENTER_API_KEY}`
        },
        rewrite: (path) => path.replace(/^\/api\/proxy\/address/, '/api/v2/getAddressInformation'),
      }
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    },
    hmr: {
      protocol: 'wss' // Для Hot Module Replacement
    }
  },
  define: {
    'process.env': process.env // Пробрасываем переменные окружения
  }
});
