import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";


export default defineConfig({
  plugins: [
    react(),
    ,
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: [
      'react-router-dom',
      '@tonconnect/ui-react',
      'react-dom/client',
    ],
  },
  build: {
    sourcemap: false, // Отключаем sourcemap для всех
    rollupOptions: {
      output: {
        sourcemapExcludeSources: true, // Исключаем исходные файлы из sourcemap
      },
    },
  },
});
