import { OfferCodeCard } from "./OfferCodeCard";
import { GUEST_OFFER_AMOUNT, GUEST_OFFER_PRODUCT_NAME } from "@/data/guest-offer";

interface GuestOfferCardProps {
  code: string;
  endsAt: string | null;
  onShop?: () => void;
}

export function GuestOfferCard({ code, endsAt, onShop }: GuestOfferCardProps) {
  return (
    <OfferCodeCard
      eyebrow="Still yours"
      title={`$${GUEST_OFFER_AMOUNT} off the ${GUEST_OFFER_PRODUCT_NAME}`}
      blurb="The code you got earlier is still unused. One use, and it can't be combined with other discounts."
      code={code}
      endsAt={endsAt}
      status="ready"
      onShop={onShop}
    />
  );
}
