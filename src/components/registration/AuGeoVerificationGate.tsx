import { useAuGeoVerification } from "@/hooks/useAuGeoVerification";
import { CheckCircle2, MapPin, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  countryCode: string | undefined;
  email: string | undefined;
};

/**
 * Renders the AU geo-verification card on the Summary step. If the country
 * is not AU, renders nothing. Blocks submission until verified.
 *
 * The submit button gates on `data-au-geo-verified="1"` on the parent form,
 * plus the server-side HMAC check in create-customer.
 */
export function AuGeoVerificationGate({ countryCode, email }: Props) {
  const geo = useAuGeoVerification({ countryCode, email });

  if (!geo.isAu) return null;

  return (
    <div
      data-au-geo-status={geo.status}
      data-au-geo-verified={geo.status === "verified" ? "1" : "0"}
      className="p-4 rounded-form border animate-stagger-2 space-y-3"
      style={{
        background:
          geo.status === "verified"
            ? "hsl(142 76% 96%)"
            : geo.status === "failed" || geo.status === "gps-denied" || geo.status === "gps-outside-au"
              ? "hsl(0 84% 97%)"
              : "hsl(210 40% 96%)",
        borderColor:
          geo.status === "verified"
            ? "hsl(142 71% 45% / 0.3)"
            : geo.status === "failed" || geo.status === "gps-denied" || geo.status === "gps-outside-au"
              ? "hsl(0 72% 51% / 0.3)"
              : "hsl(215 28% 80%)",
      }}
    >
      {geo.status === "verified" && (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-emerald-800">
              Australia location verified
            </p>
            <p className="text-xs text-emerald-700/80">
              Verified via {geo.method === "gps" ? "device location" : "network location"}.
            </p>
          </div>
        </div>
      )}

      {(geo.status === "checking" || geo.status === "idle") && (
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-muted-foreground shrink-0 animate-spin" />
          <p className="text-sm text-foreground">Verifying your location in Australia...</p>
        </div>
      )}

      {geo.status === "needs-gps" && (
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                Confirm you are in Australia
              </p>
              <p className="text-xs text-muted-foreground">
                We could not verify your country from your network. Please allow location
                access to continue. VPNs are not accepted.
              </p>
            </div>
            <Button type="button" size="sm" onClick={geo.requestGps}>
              Share location
            </Button>
          </div>
        </div>
      )}

      {geo.status === "gps-prompting" && (
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-muted-foreground shrink-0 animate-spin" />
          <p className="text-sm text-foreground">Waiting for location permission...</p>
        </div>
      )}

      {(geo.status === "gps-denied" ||
        geo.status === "gps-outside-au" ||
        geo.status === "failed") && (
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-destructive">
                {geo.status === "gps-outside-au"
                  ? "You do not appear to be in Australia"
                  : geo.status === "gps-denied"
                    ? "Location access denied"
                    : "Verification failed"}
              </p>
              <p className="text-xs text-destructive/80">
                Australian registrations are limited to applicants located in Australia.
                Disable any VPN, allow location access, and try again.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={geo.requestGps}>
                Try location again
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={geo.retry}>
                Recheck network
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
