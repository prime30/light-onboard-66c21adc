// Resolve a safe target origin for window.parent.postMessage calls.
// Returns the parent origin if it matches our allowlist; null otherwise.
// Callers MUST skip posting (rather than fall back to "*") when this
// returns null - broadcasting credentials to "*" allows any embedding
// page to capture them.
import { allowedMessageOrigins } from "@/data/allowed-origins";

function matchesPattern(origin: string, pattern: string): boolean {
  if (pattern === origin) return true;
  const m = pattern.match(/^(https?:\/\/)\*\.(.+)$/i);
  if (!m) return false;
  try {
    const u = new URL(origin);
    const proto = m[1].toLowerCase().replace("://", ":");
    const host = m[2].toLowerCase();
    if (u.protocol.toLowerCase() !== proto) return false;
    const h = u.hostname.toLowerCase();
    return h === host || h.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

export function resolveParentOrigin(): string | null {
  if (!document.referrer) return null;
  let origin: string;
  try {
    origin = new URL(document.referrer).origin;
  } catch {
    return null;
  }
  return allowedMessageOrigins.some((p) => matchesPattern(origin, p)) ? origin : null;
}
