// Build optimized: 2026-01-21T20:00:00Z
// FIX: Adiciona manual chunks para reduzir uso de memória no build (Vercel)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // HTTPS habilitado via variável de ambiente VITE_HTTPS=true
    https: process.env.VITE_HTTPS === "true" ? {} : undefined,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@modules": path.resolve(__dirname, "./src/modules"),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI Framework
          'vendor-radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          // Charts and visualization
          'vendor-charts': ['recharts', 'mermaid'],
          // Data/Backend
          'vendor-supabase': ['@supabase/supabase-js'],
          // Utilities
          'vendor-utils': ['date-fns', 'zustand', 'zod', 'clsx', 'tailwind-merge'],
          // Heavy libraries (lazy load candidates)
          'vendor-heavy': ['cytoscape', 'html2canvas', 'jspdf', 'xlsx', 'pdfjs-dist'],
        },
      },
    },
  },
}));
