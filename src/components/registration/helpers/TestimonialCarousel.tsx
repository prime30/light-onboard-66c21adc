import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const testimonials = [{
  quote: "Finally, a wholesale platform that actually understands what stylists need. The pricing is unbeatable.",
  name: "Sarah Mitchell",
  role: "Hair stylist, 8 years",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face"
}, {
  quote: "Switching to Drop Dead saved my salon 50% on supplies. The quality is top-notch.",
  name: "Marcus Chen",
  role: "Salon owner",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face"
}, {
  quote: "The community here is incredible. It's like having thousands of mentors at your fingertips.",
  name: "Jessica Torres",
  role: "Extension specialist",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face"
}, {
  quote: "2-day delivery means I never run out of product mid-appointment. Game changer!",
  name: "Amanda Brooks",
  role: "Color expert",
  avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face"
}];

export const TestimonialCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDragging) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isDragging]);

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    setDragOffset(clientX - dragStartX);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    const threshold = 50;
    if (dragOffset > threshold) {
      setCurrentIndex(prev => (prev - 1 + testimonials.length) % testimonials.length);
    } else if (dragOffset < -threshold) {
      setCurrentIndex(prev => (prev + 1) % testimonials.length);
    }
    setIsDragging(false);
    setDragOffset(0);
  };

  const testimonial = testimonials[currentIndex];

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="cursor-grab active:cursor-grabbing select-none touch-pan-y"
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        <div 
          key={currentIndex} 
          className="animate-fade-in"
          style={{
            transform: isDragging ? `translateX(${dragOffset}px)` : undefined,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            opacity: isDragging ? Math.max(1 - Math.abs(dragOffset) * 0.003, 0.7) : 1
          }}
        >
          <blockquote className="text-sm lg:text-base text-background/90 italic leading-relaxed mb-4">
            "{testimonial.quote}"
          </blockquote>
          <div className="flex items-center gap-3">
            <img src={testimonial.avatar} alt={testimonial.name} className="w-10 h-10 rounded-full border-2 border-background/20 object-cover" />
            <div>
              <p className="text-sm font-medium text-background">{testimonial.name}</p>
              <p className="text-xs text-background/50">{testimonial.role}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Carousel dots */}
      <div className="flex gap-1.5">
        {testimonials.map((_, i) => <button key={i} onClick={() => setCurrentIndex(i)} aria-label={`Go to testimonial ${i + 1}`} className={cn("h-1 rounded-full transition-all duration-300", i === currentIndex ? "w-6 bg-background/60" : "w-1 bg-background/20 hover:bg-background/30")} />)}
      </div>
    </div>
  );
};
