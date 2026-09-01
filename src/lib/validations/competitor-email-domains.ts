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
 * Returns true when the email's domain (or a registrable parent domain)
 * belongs to a known competitor. Case-insensitive, subdomain tolerant.
 */
export function isCompetitorEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;

  if (COMPETITOR_EMAIL_DOMAINS.has(domain)) return true;

  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    if (COMPETITOR_EMAIL_DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  return false;
}
