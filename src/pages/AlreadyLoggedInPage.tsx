import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextSkeleton } from "@/components/registration/TextSkeleton";
import { useGlobalApp } from "@/contexts";
import { useCloseIframe } from "@/hooks/messages";
import { useModeContext } from "@/components/registration/context/ModeContext";
import { useEffect } from "react";

export const AlreadyLoggedInPage = () => {
  const { fontsLoaded } = useGlobalApp();
  const { closeIframe } = useCloseIframe();
  const { setMode } = useModeContext();

  useEffect(() => {
    setMode("signin");
  }, [setMode]);

  const handleCloseIframe = () => {
    closeIframe();
  };

  return (
    <div className="flex-1 flex flex-col items-center px-5 md:px-6 lg:px-8 pt-[clamp(60px,12vh,120px)] pb-10 lg:pb-5 text-center space-y-[clamp(20px,5vh,40px)] min-h-screen">
      {/* Success Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
      </div>

      {/* Main Message */}
      <div className="space-y-[6px]">
        <h1 className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance">
          {fontsLoaded ? (
            <span className="animate-fade-in-text">Already logged in</span>
          ) : (
            <TextSkeleton width="70%" height="1.1em" className="mx-auto" />
          )}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed max-w-md mx-auto">
          {fontsLoaded ? (
            <span className="animate-fade-in-text">
              You're already signed in to your account. You can close this window and start
              shopping.
            </span>
          ) : (
            <TextSkeleton width="85%" height="1em" className="mx-auto" />
          )}
        </p>
      </div>

      {/* Close Button */}
      <div className="space-y-[clamp(12px,2.5vh,20px)] w-full max-w-sm">
        <Button
          onClick={handleCloseIframe}
          className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base py-3"
        >
          Continue to Store
        </Button>
      </div>
    </div>
  );
};

export default AlreadyLoggedInPage;
