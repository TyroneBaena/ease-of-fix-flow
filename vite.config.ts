import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"]
  },
  // ============================================================================
  // BUILD OPTIMIZATION - Vendor chunk splitting for better caching
  // ============================================================================
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries - cached separately for stable versioning
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client - cached separately
          'vendor-supabase': ['@supabase/supabase-js'],
          // UI components - commonly used Radix primitives
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast'
          ],
          // Charts - large library, cached separately
          'vendor-charts': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit for vendor chunks
  },
  // ============================================================================
  // PRODUCTION OPTIMIZATION - Strip console logs and debugger statements
  // ============================================================================
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
