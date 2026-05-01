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
  // Warm the browser image cache for ALL avatars as soon as testimonials are
  // known. Each avatar is small (~10-30KB) and there are at most ~8, so we can
  // safely fetch them all up front — guaranteeing zero flash on rotation.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const img = new Image();
    img.decoding = "async";
    img.src = testimonial.avatar;
  }, [testimonials]);

  return (
    <div className="space-y-4">
      <div
        className="cursor-grab active:cursor-grabbing select-none touch-pan-y"
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={handleMouseLeave}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        <div
          key={currentIndex}
          className="animate-fade-in"
          style={{
            transform: isDragging ? `translateX(${dragOffset}px)` : undefined,
            transition: isDragging ? "none" : "transform 0.3s ease-out",
            opacity: isDragging ? Math.max(1 - Math.abs(dragOffset) * 0.003, 0.7) : 1,
          }}
        >
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

        {/* Hidden but rendered <img> tags for ALL avatars. Keeping them in the
            DOM (not display:none) forces the browser to paint+decode each
            bitmap so rotating to the next slide is instant — zero flash. */}
        <div aria-hidden className="absolute pointer-events-none w-px h-px overflow-hidden opacity-0">
          {testimonials.map((t, i) => (
            <img
              key={i}
              src={t.avatar}
              alt=""
              width={1}
              height={1}
              loading="eager"
              decoding="async"
            />
          ))}
        </div>
      </div>

      {/* Carousel dots */}
      <div className="flex gap-1.5">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to testimonial ${i + 1}`}
            style={{ touchAction: "manipulation" }}
            className={cn(
              "relative h-1 rounded-full overflow-hidden transition-[width] duration-300",
              i === currentIndex ? "w-6 bg-background/20" : "w-1 bg-background/20 hover:bg-background/30"
            )}
          >
            {i === currentIndex && !isPaused && (
              <span
                key={timerKey}
                className="absolute inset-y-0 left-0 rounded-full bg-background/60"
                style={{
                  animation: `carousel-progress ${INTERVAL_MS}ms linear forwards`,
                }}
              />
            )}
            {i === currentIndex && isPaused && (
              <span className="absolute inset-y-0 left-0 w-full rounded-full bg-background/60" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
