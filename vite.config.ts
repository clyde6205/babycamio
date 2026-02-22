import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        // Never cache auth callbacks, LiveKit WebSocket, or Supabase API calls
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/, /^\/functions/],
        // Don't cache Supabase or LiveKit traffic
        navigateFallback: null,
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com/, handler: "StaleWhileRevalidate", options: { cacheName: "google-fonts-stylesheets" } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com/, handler: "CacheFirst", options: { cacheName: "google-fonts-webfonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
        ],
        // Exclude all API/realtime traffic from service worker interception
        ignoreURLParametersMatching: [/.*/],
      },
      manifest: {
        name: "BabyCam.io",
        short_name: "BabyCam",
        description: "Professional baby monitoring from any phone",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/app-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/app-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
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
