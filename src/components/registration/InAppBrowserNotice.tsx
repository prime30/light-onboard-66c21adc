import { useMemo, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import {
  detectInAppBrowser,
  inAppBrowserLabel,
  isAppleDevice,
} from "@/lib/in-app-browser";

/**
 * Shown on the password reset / activation screens when we detect a social
 * in-app webview. Those browsers routinely lose the setup token handed over
 * by the storefront, so the user is better off finishing in Safari or Chrome.
 * We give them a copyable full URL because in-app browsers do not expose an
 * address bar.
 */
export function InAppBrowserNotice({ className = "" }: { className?: string }) {
  const kind = useMemo(() => detectInAppBrowser(), []);
  const label = inAppBrowserLabel(kind);
  const apple = useMemo(() => isAppleDevice(), []);
  const [copied, setCopied] = useState(false);

  if (!kind) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked in some webviews. The URL text stays selectable.
    }
  };

  return (
    <div
      className={`w-full rounded-[15px] border border-border/50 bg-muted/60 px-5 py-4 text-left space-y-2.5 ${className}`}
    >
      <p className="font-termina text-xs uppercase tracking-[-0.006em] text-foreground/80 flex items-center gap-2">
        <ExternalLink className="w-3.5 h-3.5" />
        Open in {apple ? "Safari" : "Chrome"}
      </p>
      <p className="text-sm text-muted-foreground/80 leading-relaxed">
        You're in the {label} in-app browser, which can drop password setup links.
        {apple
          ? " Tap the ••• or share icon, then Open in Safari."
          : " Tap the ⋮ menu, then Open in Chrome."}{" "}
        Or copy this link and paste it into your browser.
      </p>
      <p className="text-[11px] break-all text-foreground/60 font-mono">{currentUrl}</p>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 text-xs text-foreground underline underline-offset-4"
      >
        <Copy className="w-3 h-3" />
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
