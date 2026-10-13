import { OfferCodeCard } from "./OfferCodeCard";
import {
  WELCOME_OFFER_AMOUNT,
  WELCOME_OFFER_MIN_SUBTOTAL,
  type WelcomeOfferStatus,
} from "@/data/welcome-offer";

interface ProWelcomeCardProps {
  code: string | null;
  endsAt: string | null;
  status: WelcomeOfferStatus;
  onShop?: () => void;
}

export function ProWelcomeCard(props: ProWelcomeCardProps) {
  return (
    <OfferCodeCard
      eyebrow="Pro welcome"
      title={`$${WELCOME_OFFER_AMOUNT} off your next order of $${WELCOME_OFFER_MIN_SUBTOTAL}+`}
      blurb="One use, just for your account. It works with your other pro offers."
      {...props}
    />
  );
}
