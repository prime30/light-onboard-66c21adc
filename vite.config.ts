import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Emit asset URLs as relative paths ("./assets/...") so the build works
  // unchanged whether served at the site root, at /apps/apply (Shopify App
  // Proxy), or any other subpath. Required for the App Proxy mount because
  // Shopify rewrites the URL but the HTML response is returned verbatim.
  base: "./",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
  },
}));
