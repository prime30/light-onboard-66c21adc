import { CheckCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeText } from "@/components/registration/FadeText";
import { useCloseIframe } from "@/hooks/messages";
import { useModeContext } from "@/components/registration/context/ModeContext";
import { useStandaloneSession } from "@/hooks/use-standalone-session";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export const AlreadyLoggedInPage = () => {
  const { closeIframe, isInIframe } = useCloseIframe();
  const { setMode } = useModeContext();
  const { customer, signOut } = useStandaloneSession();
  const navigate = useNavigate();
  const [justSignedIn, setJustSignedIn] = useState(false);

  useEffect(() => {
    setMode("signin");
    try {
      if (sessionStorage.getItem("dde_just_signed_in") === "1") {
        setJustSignedIn(true);
        sessionStorage.removeItem("dde_just_signed_in");
      }
    } catch {
      // ignore
    }
  }, [setMode]);

  const handleContinue = () => {
    if (isInIframe) {
      closeIframe();
      return;
    }
    // Standalone: send shoppers to the store front.
    window.location.href = "https://dropdeadextensions.com";
  };

  const handleSignOut = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  const greeting = "Signed in";

  const subcopy = justSignedIn
    ? customer.email
      ? `Signed in as ${customer.email}. You can close this window and start shopping.`
      : "You're signed in. You can close this window and start shopping."
    : customer.email && customer.firstName
      ? customer.email
      : "You're already signed in to your account. You can close this window and start shopping.";

  return (
    <div className="flex-1 flex flex-col items-center px-5 md:px-6 lg:px-8 pt-[clamp(60px,12vh,120px)] pb-10 lg:pb-5 text-center space-y-[clamp(20px,5vh,40px)] min-h-screen">
      {/* Success Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-status-green/20 to-status-green/30 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-status-green" />
      </div>

      {/* Main Message */}
      <div className="space-y-[6px]">
        <FadeText
          as="h1"
          className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance"
        >
          {greeting}
        </FadeText>
        <FadeText
          as="p"
          className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed max-w-md mx-auto"
        >
          {subcopy}
        </FadeText>
      </div>

      {/* Actions */}
      <div className="space-y-[15px] w-full max-w-sm">
        <Button
          onClick={handleContinue}
          className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base py-3"
        >
          {isInIframe ? "Continue to store" : "Go to store"}
        </Button>

        {!isInIframe && (
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        )}
      </div>
    </div>
  );
};

export default AlreadyLoggedInPage;
