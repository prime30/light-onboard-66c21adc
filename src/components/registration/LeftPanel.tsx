import { BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { FadeText } from "./FadeText";
import {
  CircularProgress,
  MagneticFeatureBox,
  RotatingStylistAvatars,
  TestimonialCarousel,
} from "./helpers";
import { slides, features } from "@/data/auth-constants";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import logoSvg from "@/assets/logo.svg";
import salonHero from "@/assets/salon-hero.jpg";
import slideProducts from "@/assets/slide-products.jpg";
import slideCommunity from "@/assets/slide-community.jpg";
import { useModeContext } from "./context/ModeContext";

const slideImages = [salonHero, slideProducts, slideCommunity];

export function SignInSlide() {
  return (
    <div className="flex flex-col gap-0 pb-0">
      <div className="inline-flex items-center gap-[5px] md:gap-2.5 px-2.5 md:px-[15px] py-[5px] rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-[15px] md:mb-5 lg:mb-[25px] w-fit pl-[5px] md:pl-[10px]">
        <BadgeCheck className="w-2.5 md:w-[15px] h-2.5 md:h-[15px] text-background/80" />
        <FadeText variant="light" className="text-[10px] md:text-xs font-medium text-background/80 uppercase tracking-widest">
          Exclusively professional
        </FadeText>
      </div>

      <div className="space-y-0 mb-2.5 md:mb-[15px] lg:mb-5">
        <FadeText
          as="h2"
          variant="light"
          className="font-termina font-medium uppercase text-[clamp(1.25rem,4vw,2rem)] md:text-[clamp(1.5rem,3.5vw,2.5rem)] lg:text-[clamp(1.75rem,3vw,2.75rem)] xl:text-[clamp(2.5rem,4vw,4rem)] text-background/50 leading-[1]"
        >
          Great to
        </FadeText>
        <FadeText
          as="h1"
          variant="light"
          className="font-termina font-medium uppercase text-[clamp(1.25rem,4vw,2rem)] md:text-[clamp(1.5rem,3.5vw,2.5rem)] lg:text-[clamp(1.75rem,3vw,2.75rem)] xl:text-[clamp(2.5rem,4vw,4rem)] text-background leading-[1]"
        >
          See You Again
        </FadeText>
      </div>

      <FadeText
        as="p"
        variant="light"
        className="text-xs md:text-sm lg:text-base text-background/50 md:whitespace-nowrap"
      >
        Your pro account is waiting for you
      </FadeText>
      {/* Testimonial Carousel */}
      <div className="hidden xl:block">
        <TestimonialCarousel />
      </div>
    </div>
  );
}

type RegisterCarouselSlidesProps = {
  currentSlide: number;
};

export function RegisterCarouselSlides({ currentSlide }: RegisterCarouselSlidesProps) {
  const slide = slides[currentSlide];

  return (
    <div className="flex flex-col gap-0 pb-[20px]">
      {/* Carousel content - keyed for animations */}
      <div key={currentSlide}>
        {/* Eyebrow */}
        <div
          style={{
            animationDelay: "100ms",
            animationFillMode: "forwards",
          }}
          className="inline-flex items-center gap-[5px] md:gap-2.5 px-2.5 md:px-[15px] py-[5px] rounded-full bg-background/10 backdrop-blur-sm border border-background/10 mb-[15px] md:mb-5 lg:mb-[25px] w-fit opacity-0 animate-fade-in pl-[5px] md:pl-[10px]"
        >
          <BadgeCheck className="w-2.5 md:w-[15px] h-2.5 md:h-[15px] text-background/80" />
          <FadeText variant="light" className="text-[10px] md:text-xs font-medium text-background/80 uppercase tracking-widest">
            {slide.eyebrow}
          </FadeText>
        </div>

        {/* Large Typography */}
        <div className="space-y-0 mb-2.5 md:mb-[15px] lg:mb-5">
          <FadeText
            as="h2"
            variant="light"
            className="font-termina font-medium uppercase text-[clamp(1.25rem,4vw,2rem)] md:text-[clamp(1.5rem,3.5vw,2.5rem)] lg:text-[clamp(1.75rem,3vw,2.75rem)] xl:text-[clamp(2.5rem,4vw,4rem)] text-background/50 leading-[1] opacity-0 animate-fade-in"
          >
            <span style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
              {slide.title}
            </span>
          </FadeText>
          <FadeText
            as="h1"
            variant="light"
            className="font-termina font-medium uppercase text-[clamp(1.25rem,4vw,2rem)] md:text-[clamp(1.5rem,3.5vw,2.5rem)] lg:text-[clamp(1.75rem,3vw,2.75rem)] xl:text-[clamp(2.5rem,4vw,4rem)] text-background leading-[1] opacity-0 animate-fade-in"
          >
            <span style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
              {slide.highlight}
            </span>
          </FadeText>
        </div>

        <FadeText
          as="p"
          variant="light"
          className="text-xs md:text-sm lg:text-base text-background/50 md:whitespace-nowrap mb-0 opacity-0 animate-fade-in"
        >
          <span style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
            {slide.description}
          </span>
        </FadeText>
      </div>
    </div>
  );
}

export type LeftPanelProps = {
  formProgress: number;
};

export function LeftPanel({ formProgress }: LeftPanelProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { mode } = useModeContext();

  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);
  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  return (
    <div className="relative hidden lg:flex flex-col w-full lg:w-1/2 h-[200px] sm:h-[250px] lg:h-auto lg:min-h-0 flex-shrink-0 bg-foreground overflow-hidden m-2.5 sm:m-5 mt-0 sm:mt-0 lg:mt-5 rounded-form sm:rounded-[20px] mr-0 sm:mr-0 lg:mr-0">
      {/* Sliding Background + Content Container */}
      <div
        key={mode === "signin" ? "signin-panel" : currentSlide}
        className="absolute inset-0"
        style={{
          animation: "slideIn 0.5s ease-out forwards",
        }}
      >
        {/* Hero image background */}
        <img
          src={mode === "signin" ? salonHero : slideImages[currentSlide] || salonHero}
          alt="Professional salon"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/70 to-foreground/40" />

        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Content - Different for sign-in vs sign-up */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-end p-5 md:p-5 lg:p-10 pb-[70px] lg:pb-[80px]",
            mode === "signup" ? "xl:pb-[180px]" : "xl:pb-[80px]"
          )}
        >
          {mode === "signin" ? (
            <SignInSlide />
          ) : (
            <RegisterCarouselSlides currentSlide={currentSlide} />
          )}
        </div>
      </div>

      {/* Feature Pills - Fixed (do not re-animate on carousel) */}
      {mode === "signup" && (
        <div className="absolute left-5 md:left-5 lg:left-10 right-5 md:right-5 lg:right-10 bottom-[90px] lg:bottom-[110px] hidden xl:flex flex-wrap gap-2.5 z-10 pointer-events-none">
          {features.map((feature, i) => (
            <div
              key={i}
              className="pointer-events-auto animate-haptic-pop"
              style={{ animationDelay: `${600 + i * 100}ms`, animationFillMode: "both" }}
            >
              <MagneticFeatureBox icon={feature.icon} label={feature.label} desc={feature.desc} />
            </div>
          ))}
        </div>
      )}

      {/* Circular Progress Indicator - Fixed - Only show on sign-up */}
      {mode === "signup" && (
        <div className="absolute top-5 md:top-5 lg:top-10 right-5 md:right-5 lg:right-10 z-10">
          <CircularProgress formProgress={formProgress} />
        </div>
      )}

      {/* Fixed Logo */}
      <div className="absolute top-5 md:top-5 lg:top-10 left-5 md:left-5 lg:left-10 z-10">
        <img src={logoSvg} alt="Drop Dead" className="h-4 md:h-5 w-auto" />
      </div>

      {/* Fixed Bottom Navigation - Only show slide controls on sign-up */}
      <div className="absolute bottom-5 md:bottom-5 lg:bottom-10 left-5 md:left-5 lg:left-10 right-5 md:right-5 lg:right-10 z-10 flex items-center justify-between">
        {/* Slide Indicators - Only on sign-up */}
        {mode === "signup" ? (
          <div className="flex gap-2.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={cn(
                  "h-[5px] rounded-full transition-all duration-300",
                  i === currentSlide ? "w-10 bg-background" : "w-[5px] bg-background/20"
                )}
              />
            ))}
          </div>
        ) : (
          <div />
        )}

        {/* Trust Badge - visible on all sizes */}
        <RotatingStylistAvatars />

        {/* Nav Arrows - Desktop - Only on sign-up */}
        {mode === "signup" ? (
          <div className="hidden lg:flex gap-2.5">
            <button
              onClick={goToPrevSlide}
              className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-[15px] h-[15px] text-background/70" />
            </button>
            <button
              onClick={goToNextSlide}
              className="p-2.5 rounded-full bg-background/5 border border-background/10 hover:bg-background/10 transition-all"
              aria-label="Next slide"
            >
              <ChevronRight className="w-[15px] h-[15px] text-background/70" />
            </button>
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
