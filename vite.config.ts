import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target older Android WebViews (Chrome 80+)
    target: "es2020",
    // Smaller chunks for faster parsing on low-end CPUs
    chunkSizeWarningLimit: 300,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React in its own chunk (cached across navigations)
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI library isolated so page chunks stay small
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-tooltip", "@radix-ui/react-select"],
          // Heavy libraries loaded only when needed
          "vendor-charts": ["recharts"],
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
    // Enable source maps only in dev
    sourcemap: mode === "development",
  },
}));
