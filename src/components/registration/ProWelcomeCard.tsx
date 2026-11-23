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
  /** EU applicants: the code is a fixed USD amount, so say so, and use day-first dates. */
  eu?: boolean;
}

export function ProWelcomeCard({ eu = false, ...props }: ProWelcomeCardProps) {
  const currency = eu ? "US$" : "$";
  return (
    <OfferCodeCard
      eyebrow="Pro welcome"
      title={`${currency}${WELCOME_OFFER_AMOUNT} off your next order of ${currency}${WELCOME_OFFER_MIN_SUBTOTAL}+`}
      blurb="One use, just for your account. It works with your other pro offers."
      dateLocale={eu ? "en-GB" : "en-US"}
      {...props}
    />
  );
}
