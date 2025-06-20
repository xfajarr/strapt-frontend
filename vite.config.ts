import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      '@dynamic-labs/sdk-react-core',
      '@dynamic-labs/ethereum',
      '@dynamic-labs/wagmi-connector',
      'wagmi',
      'viem',
      'viem/chains',
      'viem/utils',
      '@tanstack/react-query'
    ],
    exclude: ['ccip'],
    force: true
  },
  define: {
    global: 'globalThis',
  },
}));
