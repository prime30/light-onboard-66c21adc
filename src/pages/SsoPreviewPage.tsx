import { useMemo, useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { PARTNER_PRESENTATION } from "@/lib/sso-context";

/**
 * Internal dev page: lists every SSO partner variant with a live iframe
 * preview + copyable URL. Use this to design and tweak partner copy without
 * editing query params by hand.
 *
 * Not linked from the app — visit /sso-preview directly.
 */

type Variant = {
  slug: string;
  displayName: string;
  description: string;
};

const BUILT_IN_VARIANTS: Variant[] = Object.entries(PARTNER_PRESENTATION).map(
  ([slug, cfg]) => ({
    slug,
    displayName: cfg.label,
    description: cfg.tagline,
  })
);

const GENERIC_VARIANT: Variant = {
  slug: "",
  displayName: "",
  description: "Default shell — no ?sso= param, no branding.",
};

const UNKNOWN_VARIANT: Variant = {
  slug: "acme-pro",
  displayName: "Acme Pro",
  description:
    "Unknown slug → falls back to the parent-supplied display_name (forward-compatible).",
};

function buildUrl(slug: string, displayName: string) {
  if (!slug) return "/login";
  const params = new URLSearchParams();
  params.set("sso", slug);
  if (displayName) params.set("display_name", displayName);
  return `/login?${params.toString()}`;
}

function VariantCard({ variant }: { variant: Variant }) {
  const url = useMemo(
    () => buildUrl(variant.slug, variant.displayName),
    [variant.slug, variant.displayName]
  );
  const [copied, setCopied] = useState(false);

  const fullUrl =
    typeof window !== "undefined" ? `${window.location.origin}${url}` : url;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const title = variant.slug
    ? `${variant.slug} — ${variant.displayName || "(no display name)"}`
    : "generic (no SSO)";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {variant.description}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition"
            aria-label="Copy URL"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition"
          >
            Open <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="px-5 pt-3 pb-2">
        <code className="block w-full text-[11px] font-mono text-muted-foreground bg-muted/40 rounded px-2 py-1.5 truncate">
          {url}
        </code>
      </div>

      <div className="relative bg-muted/30 border-t border-border" style={{ aspectRatio: "16 / 10" }}>
        <iframe
          src={url}
          title={`Preview ${title}`}
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}

function CustomTester() {
  const [slug, setSlug] = useState("syndicate");
  const [displayName, setDisplayName] = useState("The Syndicate");

  const variant: Variant = {
    slug: slug.trim().toLowerCase(),
    displayName: displayName.trim(),
    description: "Live custom variant — change the slug or display name to test.",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-8 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Custom variant tester</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Validate any slug + display name. Slugs must match{" "}
          <code className="text-xs">/^[a-z0-9-]{"{1,32}"}$/</code>; invalid values
          fall back to the generic shell.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            sso slug
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="syndicate"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            display_name
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="The Syndicate"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </label>
      </div>

      <VariantCard variant={variant} />
    </div>
  );
}

export default function SsoPreviewPage() {
  const variants: Variant[] = [GENERIC_VARIANT, ...BUILT_IN_VARIANTS, UNKNOWN_VARIANT];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            internal · dev preview
          </p>
          <h1 className="text-2xl font-semibold text-foreground mt-1">
            SSO login shell variants
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Live previews of every partner-branded login experience. Each variant
            is driven entirely by URL params (
            <code className="text-xs">?sso=&lt;slug&gt;&amp;display_name=&lt;name&gt;</code>
            ). Built-in copy lives in{" "}
            <code className="text-xs">PARTNER_PRESENTATION</code> in{" "}
            <code className="text-xs">src/lib/sso-context.ts</code>.
          </p>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <CustomTester />

        <h2 className="text-base font-semibold text-foreground mb-4">
          Built-in variants
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {variants.map((v) => (
            <VariantCard key={v.slug || "generic"} variant={v} />
          ))}
        </div>
      </main>
    </div>
  );
}
