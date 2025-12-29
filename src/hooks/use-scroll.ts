import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

type UseScrollProps = {
  mainScrollRef: MutableRefObject<HTMLElement | null>;
};

export function useScroll({ mainScrollRef }: UseScrollProps) {
  // Parallax scroll effect for mobile hero
  const [reset, setReset] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const [headerGradientOpacity, setHeaderGradientOpacity] = useState(0);
  const [footerGradientOpacity, setFooterGradientOpacity] = useState(1);

  // Scroll hint reappear delay
  const scrollHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollTop = el.scrollTop;
      // Parallax factor - image moves at 30% of scroll speed
      setParallaxOffset(scrollTop * 0.3);

      // Dynamic header gradient opacity based on scroll position (0-200px range)
      const gradientOpacity = Math.min(scrollTop / 200, 1);
      setHeaderGradientOpacity(gradientOpacity);

      // Dynamic footer gradient opacity based on distance from bottom (stronger when further from bottom)
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;
      const distanceFromBottom = scrollHeight - clientHeight - scrollTop;
      const footerOpacity = Math.min(distanceFromBottom / 150, 1);
      setFooterGradientOpacity(footerOpacity);

      // Hide scroll hint immediately when scrolling past 50px
      if (scrollTop > 50) {
        if (scrollHintTimeoutRef.current) {
          clearTimeout(scrollHintTimeoutRef.current);
          scrollHintTimeoutRef.current = null;
        }
        setHasScrolled(true);
      } else {
        // Delay showing hint again when back at top
        if (!scrollHintTimeoutRef.current && hasScrolled) {
          scrollHintTimeoutRef.current = setTimeout(() => {
            setHasScrolled(false);
            scrollHintTimeoutRef.current = null;
          }, 800);
        }
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollHintTimeoutRef.current) {
        clearTimeout(scrollHintTimeoutRef.current);
      }
    };
  }, [reset, hasScrolled, mainScrollRef]);

  // Reset hasScrolled when step changes
  useEffect(() => {
    setHasScrolled(false);
  }, [reset]);

  const resetScroll = useCallback(() => {
    setReset((prev) => prev + 1);
  }, [setReset]);

  return {
    parallaxOffset,
    headerGradientOpacity,
    footerGradientOpacity,
    hasScrolled,
    resetScroll,
  };
}
