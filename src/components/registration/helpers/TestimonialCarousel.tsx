import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useReviews, type Review } from "@/hooks/use-reviews";

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
      "Finally, a wholesale platform that actually understands what stylists need. The pricing is unbeatable.",
    name: "Sarah M.",
    role: "Hair stylist, 8 years",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
  },
  {
    quote: "Switching to Drop Dead saved my salon 50% on supplies. The quality is top-notch.",
    name: "Marcus C.",
    role: "Salon owner",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
  },
  {
    quote:
      "The community here is incredible. It's like having thousands of mentors at your fingertips.",
    name: "Jessica T.",
    role: "Extension specialist",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face",
  },
  {
    quote: "2-day delivery means I never run out of product mid-appointment. Game changer!",
    name: "Amanda B.",
    role: "Color expert",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
  },
];

function reviewToTestimonial(r: Review): Testimonial {
  return {
    quote: r.content,
    name: r.authorName,
    role: r.productName ? `Verified · ${r.productName}` : "Verified stylist",
    avatar: r.avatar,
  };
}

export const TestimonialCarousel = () => {
  const { data: liveReviews } = useReviews(8);

  const testimonials = useMemo<Testimonial[]>(() => {
    if (liveReviews && liveReviews.length > 0) {
      return liveReviews.map(reviewToTestimonial);
    }
    return fallbackTestimonials;
  }, [liveReviews]);

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
              className="w-10 h-10 rounded-full border-2 border-background/20 object-cover"
            />
            <div>
              <p className="text-sm font-medium text-background">{testimonial.name}</p>
              <p className="text-xs text-background/50">{testimonial.role}</p>
            </div>
          </div>
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
