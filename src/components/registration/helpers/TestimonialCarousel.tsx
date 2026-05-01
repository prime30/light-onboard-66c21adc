import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
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

const INTERVAL_MS = 5000;

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatar: string;
};

const fallbackTestimonials: Testimonial[] = [
  {
    quote:
      "Honestly wasn't sure at first but the wefts hold up way better than what I was paying double for. Clients keep asking who does my install lol.",
    name: "Sarah M.",
    role: "Stylist · 8 yrs behind the chair",
    avatar: stylistOmbre1,
  },
  {
    quote:
      "Cut our supply spend almost in half this quarter. Only thing I'd change is I wish I switched sooner.",
    name: "Jamie C.",
    role: "Salon owner, Phoenix",
    avatar: stylistLavender1,
  },
  {
    quote:
      "Been doing K-tips around the hairline and SuperWefts through the back as a hybrid install. Blends seamless and the retention is unreal.",
    name: "Jess T.",
    role: "Extension specialist",
    avatar: stylistTeal1,
  },
  {
    quote:
      "Ordered Tuesday, installed Thursday. That's it. That's the review.",
    name: "Amanda B.",
    role: "Independent colorist",
    avatar: stylistPink1,
  },
];

export const TestimonialCarousel = () => {
  const testimonials = fallbackTestimonials;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  // Incrementing this key restarts the CSS progress animation on the active dot
  const [timerKey, setTimerKey] = useState(0);

  // Reset to first slide when the source changes (live reviews loading in)
  useEffect(() => {
    setCurrentIndex(0);
    setTimerKey((k) => k + 1);
  }, [testimonials.length]);

  // Warm the browser image cache for ALL avatars as soon as testimonials are
  // known. Each avatar is small (~10-30KB) and there are at most ~8, so we can
  // safely fetch them all up front — guaranteeing zero flash on rotation.
  useEffect(() => {
    if (typeof window === "undefined") return;
    for (const t of testimonials) {
      if (!t?.avatar) continue;
      const img = new Image();
      img.decoding = "async";
      img.src = t.avatar;
    }
  }, [testimonials]);

  const advance = useCallback(
    (dir: 1 | -1 = 1) => {
      setCurrentIndex((prev) => (prev + dir + testimonials.length) % testimonials.length);
      setTimerKey((k) => k + 1);
    },
    [testimonials.length]
  );

  const goTo = useCallback((i: number) => {
    setCurrentIndex(i);
    setTimerKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (isDragging || isPaused) return;
    const id = setInterval(() => advance(), INTERVAL_MS);
    return () => clearInterval(id);
  }, [isDragging, isPaused, advance]);

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    setDragOffset(clientX - dragStartX);
  };

  const handleDragEnd = () => {
    if (isDragging) {
      const threshold = 50;
      if (dragOffset > threshold) advance(-1);
      else if (dragOffset < -threshold) advance(1);
      setIsDragging(false);
      setDragOffset(0);
    }
  };

  const handleMouseLeave = () => {
    handleDragEnd();
    setIsPaused(false);
  };

  const testimonial = testimonials[currentIndex] ?? testimonials[0];

  if (!testimonial) return null;

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
