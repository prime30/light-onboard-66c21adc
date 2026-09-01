// Competitor email domains that are not allowed to register a wholesale
// account. Keep entries lowercase, no leading "@". Subdomains match too.
export const COMPETITOR_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "bellami.com",
  "bellamiprofessional.com",
  "glamseamless.com",
  "kovihair.com",
  "dreamcatchers.com",
  "covetandmane.com",
  "invisiblebeadextensions.com",
  "harperellis.com",
  "mourninghair.com",
  "philocalyhairextensions.com",
]);

export const COMPETITOR_EMAIL_MESSAGE =
  "We don't allow direct competitors to purchase our products. Please use a different email if this is a mistake.";

/**
 * Live blocklist. Seeded with the bundled defaults and replaced at boot with
 * the admin-editable list from app_settings, so blocklist edits take effect
 * without a frontend deploy.
 */
let activeDomains: Set<string> = new Set(COMPETITOR_EMAIL_DOMAINS);

/** Replace the runtime blocklist. Ignores empty lists (treated as unavailable). */
export function setCompetitorEmailDomains(domains: readonly string[] | null | undefined): void {
  if (!domains || domains.length === 0) return;
  const next = new Set(
    domains
      .map((d) => String(d).trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean)
  );
  if (next.size > 0) activeDomains = next;
}

/** Current runtime blocklist, for display or debugging. */
export function getCompetitorEmailDomains(): string[] {
  return [...activeDomains];
}

/**
 * Returns true when the email's domain (or a registrable parent domain)
 * belongs to a known competitor. Case-insensitive, subdomain tolerant.
 */
export function isCompetitorEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;

  if (activeDomains.has(domain)) return true;

  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    if (activeDomains.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

