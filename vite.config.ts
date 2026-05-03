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
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Inject fetchpriority="high" on the entry module script + add an
    // explicit modulepreload hint as early as possible. Vite already injects
    // modulepreload for the entry's static imports during HTML transformation,
    // but this nudges the browser to prioritize the entry fetch over images
    // and lower-priority resources inside the iframe.
    {
      name: "boot-fetchpriority",
      transformIndexHtml(html: string) {
        return html.replace(
          /<script type="module" (crossorigin )?src="([^"]+)"><\/script>/,
          (_m: string, cors: string | undefined, src: string) =>
            `<script type="module" ${cors ?? ""}src="${src}" fetchpriority="high"></script>`
        );
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split stable vendor code into long-lived chunks so a deploy that
        // only touches app code doesn't bust the React/Radix/framer cache.
        // First-load cost is unchanged (same total bytes, downloaded in
        // parallel with modulepreload); repeat visits across deploys are
        // dramatically faster.
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router"],
          "motion-vendor": ["framer-motion"],
        },
      },
    },
  },
  test: {
    globals: true,
  },
}));
