import { ShoppingBag, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeText } from "@/components/registration/FadeText";
import { useCloseIframe } from "@/hooks/messages";

const SUPPORT_URL = "https://dropdeadhair.com/pages/contact";

export const NotEligiblePage = () => {
  const { closeIframe, isInIframe } = useCloseIframe();

  const handleGoToShop = () => {
    if (isInIframe) {
      closeIframe();
    } else {
      window.location.href = "https://dropdeadhair.com/";
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center w-full h-full px-5 md:px-6 lg:px-8 pb-10">
      <div className="max-w-[38rem] w-full flex flex-col items-center text-center space-y-[clamp(14px,3vh,30px)] animate-step-enter-left">
        <div className="space-y-[10px]">
          <FadeText
            as="h1"
            className="font-termina font-medium uppercase text-2xl sm:text-3xl md:text-4xl text-foreground leading-[1.1] text-balance"
          >
            The Syndicate is for Drop Dead customers
          </FadeText>
          <FadeText
            as="p"
            className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed text-balance"
          >
            Your first order unlocks full access to the community — techniques,
            behind-the-brand content, and direct access to the team.
          </FadeText>
        </div>

        <div className="w-full space-y-[clamp(10px,2vh,18px)] animate-stagger-3">
          <Button
            onClick={handleGoToShop}
            className="w-full h-button rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium text-base group"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Go to shop
          </Button>

          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 w-full"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="relative">
              Questions? Contact support
              <span className="absolute left-0 bottom-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
            </span>
          </a>
        </div>

        <div className="pt-[clamp(12px,3vh,28px)] w-full">
          <p className="text-xs sm:text-[13px] text-muted-foreground/60 leading-relaxed text-balance">
            Once your first order is placed, return here and sign in again.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotEligiblePage;
