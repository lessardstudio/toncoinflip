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
  define: {
    'process.env': {
      TON_NETWORK: JSON.stringify(process.env.NODE_ENV === 'development' ? 'testnet' : 'mainnet'),
      VITE_CONTRACT_ADDRESS: JSON.stringify(process.env.VITE_CONTRACT_ADDRESS || '')
    },
    // Для некоторых библиотек нужно явно указать global
    global: 'globalThis',
  }
});
