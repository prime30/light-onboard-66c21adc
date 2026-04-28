/// <reference types="vite/client" />

interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  VITE_SUPABASE_PROJECT_ID: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
  VITE_SUPABASE_URL: string;
  VITE_BACKEND_URL: string;
  VITE_IFRAME_PARENT_ORIGIN?: string;
  VITE_SHOPIFY_PARENT_ORIGINS?: string;
  VITE_COLOR_RING_VARIANT_ID?: string;
  // NOTE: HELIUM_PRIVATE_ACCESS_TOKEN, HELIUM_PRIVATE_FORM_ID, and
  // GOOGLE_PLACES_API_KEY are server-side only secrets used by Supabase
  // Edge Functions via Deno.env.get(). They are intentionally NOT
  // declared here to prevent accidental client-side use.
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
