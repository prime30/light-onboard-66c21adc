import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCheck, Copy, Mail, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  WELCOME_OFFER_AMOUNT,
  WELCOME_OFFER_MIN_SUBTOTAL,
  formatWelcomeOfferExpiry,
  type WelcomeOfferStatus,
} from "@/data/welcome-offer";

interface ProWelcomeCardProps {
  code: string | null;
  endsAt: string | null;
  status: WelcomeOfferStatus;
  onShop?: () => void;
}

export function ProWelcomeCard({ code, endsAt, status, onShop }: ProWelcomeCardProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const expiry = formatWelcomeOfferExpiry(endsAt);

  useEffect(() => () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
  }, []);

  const handleCopy = useCallback(() => {
    if (!code) return;
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        if (resetTimer.current) window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard can be blocked inside the iframe; the code stays visible.
      });
  }, [code]);

  return (
    <div
      id="success-offer-section"
      className="rounded-form border border-border/60 bg-muted/30 text-left px-5 pt-6 pb-5"
    >
      <p className="font-mono-eyebrow text-[10px] text-muted-foreground">Pro welcome</p>
      <h3 className="mt-2 text-[22px] leading-[1.15] font-medium text-foreground tracking-[-0.01em]">
        ${WELCOME_OFFER_AMOUNT} off your next order of ${WELCOME_OFFER_MIN_SUBTOTAL}+
      </h3>
      <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
        One use, just for your account. It works with your other pro offers.
      </p>

      {status === "ready" && code ? (
        <button
          type="button"
          onClick={handleCopy}
          className="w-full mt-4 min-h-11 touch-manipulation flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-dashed border-foreground/30 bg-background/70 hover:bg-background transition-colors"
          aria-label={`Copy discount code ${code}`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Tag className="w-3.5 h-3.5 text-foreground/70 shrink-0" />
            <span className="text-sm font-mono font-semibold text-foreground tracking-wider truncate">
              {code}
            </span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0" aria-live="polite">
            {copied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-status-green" />
                <span className="text-status-green">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </span>
        </button>
      ) : status === "loading" ? (
        <div
          className="w-full mt-4 min-h-11 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border/60 bg-muted/50"
          aria-label="Preparing your code"
        >
          <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="h-3 w-36 bg-muted-foreground/20 rounded" />
        </div>
      ) : (
        <div className="w-full mt-4 min-h-11 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border/60 bg-muted/50">
          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[13px] text-muted-foreground">
            We'll email your code to you shortly.
          </span>
        </div>
      )}

      {status === "ready" && expiry && (
        <p className="mt-2 text-[12px] text-muted-foreground">Valid until {expiry}.</p>
      )}

      {onShop && (
        <Button
          type="button"
          onClick={onShop}
          className="w-full mt-5 h-12 min-h-12 touch-manipulation rounded-form group"
        >
          <span className="flex items-center justify-center gap-2">
            Start shopping
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Button>
      )}
    </div>
  );
}
