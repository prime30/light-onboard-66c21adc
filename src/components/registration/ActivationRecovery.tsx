import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/TextInput";
import { useApiClient } from "@/hooks/use-api-client";

/**
 * Self-service escape hatch for the Shopify account-invite path.
 *
 * The storefront activation link hands the token to this SPA through the
 * theme. When that handoff loses the token (sessionStorage unavailable in an
 * in-app email browser, stale link, token already consumed), the applicant
 * used to hit a dead end that only said "contact support".
 *
 * This block lets them type their email and get a fresh, verified password
 * setup email from the recover-password function, which promotes
 * invited/disabled Shopify customers to enabled before sending.
 */
export function ActivationRecovery({ defaultEmail = "" }: { defaultEmail?: string }) {
  const { apiCall } = useApiClient();
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const send = async () => {
    if (!emailLooksValid || status === "sending") return;
    setStatus("sending");
    setError("");
    const result = await apiCall(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recover-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }
    );
    if (result.success) {
      setStatus("sent");
    } else {
      setError(
        (result as { error?: string }).error ||
          "We couldn't send the setup email. Please try again in a moment."
      );
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="w-full rounded-[15px] bg-muted/60 px-5 py-4 text-left space-y-1">
        <p className="font-termina text-xs uppercase tracking-[-0.006em] text-foreground/80">
          Check your email
        </p>
        <p className="text-sm text-muted-foreground/80 leading-relaxed">
          We sent a password setup link to {email.trim().toLowerCase()}. It arrives within a couple
          of minutes. Check spam if you don't see it.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 text-left">
      <p className="text-sm text-muted-foreground/80 leading-relaxed">
        Enter your email and we'll send a fresh password setup link.
      </p>
      <TextInput
        type="email"
        placeholder="you@salon.com"
        name="recovery-email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      {error && <p className="text-xs text-destructive leading-relaxed">{error}</p>}
      <Button
        onClick={send}
        disabled={!emailLooksValid || status === "sending"}
        className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base"
      >
        {status === "sending" ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Sending
          </span>
        ) : (
          "Send setup link"
        )}
      </Button>
      <a
        href="mailto:hello@dropdeadextensions.com"
        className="block text-center text-xs text-muted-foreground/60 underline underline-offset-4"
      >
        Still stuck? Contact support
      </a>
    </div>
  );
}
