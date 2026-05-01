import { useEffect } from "react";
import stylistPink1 from "@/assets/avatars/stylist-pink-1.jpg";
import stylistPurple1 from "@/assets/avatars/stylist-purple-1.jpg";
import stylistBlue1 from "@/assets/avatars/stylist-blue-1.jpg";
import stylistOmbre1 from "@/assets/avatars/stylist-ombre-1.jpg";
import stylistTeal1 from "@/assets/avatars/stylist-teal-1.jpg";
import stylistLavender1 from "@/assets/avatars/stylist-lavender-1.jpg";
import stylistMagenta1 from "@/assets/avatars/stylist-magenta-1.jpg";
import stylistElectric1 from "@/assets/avatars/stylist-electric-1.jpg";

// Preload + decode ALL avatar bitmaps the moment this module is imported.
// Because the carousel is part of the auth hero panel (loaded on first paint),
// this guarantees every possible avatar is fully decoded in the browser cache
// before the carousel ever rotates — eliminating the "image loads in" flash.
const ALL_AVATARS = [
  stylistPink1,
  stylistPurple1,
  stylistBlue1,
  stylistOmbre1,
  stylistTeal1,
  stylistLavender1,
  stylistMagenta1,
  stylistElectric1,
];

if (typeof window !== "undefined") {
  for (const src of ALL_AVATARS) {
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = "high";
    img.src = src;
    img.decode?.().catch(() => {});
  }
}

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatar: string;
};

const testimonial: Testimonial = {
  quote:
    "Not only was everything super easy to find but I got the cutest interactive message when I placed my order which just made everything even more exciting :) The hair came SO FAST and I work in Boston, MA. The packaging is just as high quality as the hair inside, the entire experience from buying the hair online to opening the extensions felt luxurious & it didn't cost an unreasonable amount of money! I have to say I am so happy with my whole experience and will only be purchasing Drop Dead Extensions from here on out! Thank you Kristi!",
  name: "Lex C.",
  role: "Verified stylist",
  avatar: stylistPink1,
};

export const TestimonialCarousel = () => {
  // Warm the browser image cache for the only curated hero review avatar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const img = new Image();
    img.decoding = "async";
    img.src = testimonial.avatar;
  }, []);

  return (
    <div className="space-y-4">
      <div className="select-none touch-pan-y">
        <div className="animate-fade-in">
          <blockquote className="text-sm lg:text-base text-background/90 italic leading-relaxed mb-4">
            "{testimonial.quote}"
          </blockquote>
          <div className="flex items-center gap-3">
            <img
              src={testimonial.avatar}
              alt={testimonial.name}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-10 h-10 rounded-full border-2 border-background/20 object-cover"
            />
            <div>
              <p className="text-sm font-medium text-background">{testimonial.name}</p>
              <p className="text-xs text-background/50">{testimonial.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
