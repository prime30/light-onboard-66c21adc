import { useState } from "react";
import { Check, ShoppingBag, Heart, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCountdown } from "@/hooks/use-countdown";
import colorRingProduct from "@/assets/color-ring-product.png";

interface SuccessFormProps {
  referralSource: string;
  onReferralSourceChange: (value: string) => void;
}

export const SuccessForm = ({
  referralSource,
  onReferralSourceChange
}: SuccessFormProps) => {
  const countdown = useCountdown(48);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState("");
  
  const handleReferralSelect = (value: string) => {
    if (value === "other") {
      setShowOtherInput(true);
      return;
    }
    setShowOtherInput(false);
    setOtherText("");
    if (value !== referralSource) {
      onReferralSourceChange(value);
      toast.success("Thanks! Your response has been saved", {
        duration: 2000,
      });
    }
  };

  const handleOtherTextChange = (text: string) => {
    setOtherText(text);
    if (text.trim()) {
      onReferralSourceChange(`other: ${text.trim()}`);
    }
  };

  const handleOtherBlur = () => {
    if (otherText.trim()) {
      toast.success("Thanks! Your response has been saved", {
        duration: 2000,
      });
    }
  };
  
  const handleAddToCart = () => {
    setIsAddingToCart(true);
  };
  const formatNumber = (num: number) => num.toString().padStart(2, '0');
  
  const referralOptions = [
    { value: "instagram", label: "Instagram" },
    { value: "tiktok", label: "TikTok" },
    { value: "facebook", label: "Facebook" },
    { value: "google", label: "Google Search" },
    { value: "friend", label: "Friend or Colleague" },
    { value: "salon", label: "My Salon" },
    { value: "event", label: "Industry Event" },
  ];

  return <div className="space-y-[25px] animate-fade-in text-center">
    {/* Success Icon */}
    <div className="relative h-[130px] mb-5">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-muted to-accent/20 opacity-60" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[65px] h-[65px] rounded-full bg-foreground flex items-center justify-center">
          <Check className="w-[30px] h-[30px] text-background" strokeWidth={2.5} />
        </div>
      </div>
      
      {/* Floating decorations */}
      <div className="absolute top-2.5 left-1/4 w-[30px] h-[30px] rounded-[10px] bg-muted border border-border flex items-center justify-center animate-fade-in" style={{
        animationDelay: "0.2s"
      }}>
        <ShoppingBag className="w-[15px] h-[15px] text-muted-foreground" />
      </div>
      <div className="absolute top-5 right-1/4 w-[25px] h-[25px] rounded-full bg-muted border border-border flex items-center justify-center animate-fade-in" style={{
        animationDelay: "0.4s"
      }}>
        <Heart className="w-[15px] h-[15px] text-muted-foreground" />
      </div>
      <div className="absolute bottom-2.5 right-1/3 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center animate-fade-in" style={{
        animationDelay: "0.6s"
      }}>
        <Sparkles className="w-2.5 h-2.5 text-muted-foreground" />
      </div>
    </div>

    <div className="space-y-2.5">
      <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
        You're all set!
      </h1>
      <p className="text-muted-foreground">
        Your account has been successfully submitted. Our team will review and approve or deny your professional account within 24 hours.
      </p>
    </div>

    {/* Pro Member */}
    <div className="p-5 rounded-[20px] bg-muted border border-border/50">
      <div className="flex items-center gap-5">
        <div className="w-[50px] h-[50px] rounded-form bg-foreground flex items-center justify-center">
          <Sparkles className="w-[25px] h-[25px] text-background" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Pro Member</p>
          <p className="text-xs text-muted-foreground">
            Confirmation email will be sent to your inbox
          </p>
        </div>
      </div>
    </div>

    {/* First Purchase Upsell */}
    <div id="success-offer-section" className="space-y-3">
      {/* Title and Timer */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Offer while you wait</p>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-accent-red animate-pulse" />
          <div className="flex items-center gap-1 text-[11px] text-accent-red font-semibold tabular-nums">
            <span className="bg-accent-red/10 px-1.5 py-0.5 rounded">{formatNumber(countdown.hours)}h</span>
            <span>:</span>
            <span className="bg-accent-red/10 px-1.5 py-0.5 rounded">{formatNumber(countdown.minutes)}m</span>
            <span>:</span>
            <span className="bg-accent-red/10 px-1.5 py-0.5 rounded">{formatNumber(countdown.seconds)}s</span>
          </div>
        </div>
      </div>

      {/* Product Card */}
      <div className="p-5 rounded-[20px] bg-gradient-to-br from-accent-red/10 via-muted/50 to-accent-red/5 border border-accent-red/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-accent-red text-white text-[10px] font-semibold px-3 py-1 rounded-bl-xl">
          30% OFF
        </div>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-border shrink-0">
            <img src={colorRingProduct} alt="Color Ring Product" className="w-full h-full object-cover" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-[10px] font-medium text-accent-red uppercase tracking-wider mb-0.5">
              Recommended for you
            </p>
            <p className="text-sm font-semibold text-foreground">Color Ring</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Perfect for matching colors with clients
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddToCart} disabled={isAddingToCart} className="w-full mt-4 h-9 rounded-xl border-accent-red/30 text-accent-red hover:bg-accent-red/10 hover:text-accent-red group disabled:opacity-100">
          {isAddingToCart ? <div className="w-4 h-4 border-2 border-accent-red/30 border-t-accent-red rounded-full animate-spin" /> : <>
              <ShoppingBag className="w-0 h-4 opacity-0 group-hover:w-4 group-hover:opacity-100 group-hover:mr-2 transition-all duration-200" />
              Add to Cart
          </>}
        </Button>
      </div>
    </div>

    {/* Divider */}
    <div className="h-px bg-border/50" />

    {/* How did you hear about us */}
    <div className="space-y-3 text-left">
      <h2 className="text-lg font-semibold text-foreground">How did you hear about us?</h2>
      <div className="grid grid-cols-2 gap-2">
        {referralOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleReferralSelect(option.value)}
            className={cn(
              "p-3 rounded-xl border text-left text-sm transition-all duration-200",
              referralSource === option.value
                ? "border-foreground bg-foreground/5 font-medium"
                : "border-border/50 hover:border-foreground/30 hover:bg-muted/60"
            )}
          >
            {option.label}
          </button>
        ))}
        {/* Other option - shows input when selected */}
        {showOtherInput ? (
          <input
            type="text"
            value={otherText}
            onChange={(e) => handleOtherTextChange(e.target.value)}
            onBlur={handleOtherBlur}
            placeholder="Please specify..."
            autoFocus
            maxLength={100}
            className="p-3 rounded-xl border border-foreground bg-foreground/5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        ) : (
          <button
            onClick={() => handleReferralSelect("other")}
            className={cn(
              "p-3 rounded-xl border text-left text-sm transition-all duration-200",
              referralSource.startsWith("other:")
                ? "border-foreground bg-foreground/5 font-medium"
                : "border-border/50 hover:border-foreground/30 hover:bg-muted/60"
            )}
          >
            Other
          </button>
        )}
      </div>
    </div>
  </div>;
};
