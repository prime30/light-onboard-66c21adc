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
  HELIUM_PRIVATE_ACCESS_TOKEN: string;
  HELIUM_PRIVATE_FORM_ID: string;
  GOOGLE_PLACES_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
