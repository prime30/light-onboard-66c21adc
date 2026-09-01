// Detects social in-app webviews (Instagram, Facebook, TikTok, Snapchat,
// Pinterest, LinkedIn, Twitter). These browsers frequently open links in a
// throwaway session, which drops the sessionStorage handoff our password
// reset / activation screens rely on, and they sometimes swallow email link
// taps entirely. When we detect one, we nudge the user to open the link in
// their real browser instead of letting them hit a silent dead end.

export type InAppBrowser =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "snapchat"
  | "pinterest"
  | "linkedin"
  | "twitter"
  | null;

export function detectInAppBrowser(ua?: string): InAppBrowser {
  const agent = (ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  if (!agent) return null;
  if (agent.includes("instagram")) return "instagram";
  if (agent.includes("fban") || agent.includes("fbav") || agent.includes("fb_iab")) return "facebook";
  if (agent.includes("bytelo") || agent.includes("musical_ly") || agent.includes("tiktok")) return "tiktok";
  if (agent.includes("snapchat")) return "snapchat";
  if (agent.includes("pinterest")) return "pinterest";
  if (agent.includes("linkedinapp")) return "linkedin";
  if (agent.includes("twitter")) return "twitter";
  return null;
}

const LABELS: Record<Exclude<InAppBrowser, null>, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
  linkedin: "LinkedIn",
  twitter: "X",
};

export function inAppBrowserLabel(kind: InAppBrowser): string | null {
  return kind ? LABELS[kind] : null;
}

export function isAppleDevice(ua?: string): boolean {
  const agent = (ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  return /iphone|ipad|ipod|macintosh/.test(agent);
}
