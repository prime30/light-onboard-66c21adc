import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyRegistration from "./tools/get-my-registration";
import listMyMarketingConsent from "./tools/list-my-marketing-consent";
import updateMyCommunicationPreferences from "./tools/update-my-communication-preferences";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// literal Vite inlines at build time (import-safe: no runtime env read).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "bright-start-flow",
  title: "Bright Start Flow",
  version: "0.1.0",
  instructions:
    "Tools for the Drop Dead Extensions pro registration app. Every tool acts as the signed-in user: read their wholesale registration profile, review their marketing consent history, and update their communication preferences or Instagram handle.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyRegistration, listMyMarketingConsent, updateMyCommunicationPreferences],
});
