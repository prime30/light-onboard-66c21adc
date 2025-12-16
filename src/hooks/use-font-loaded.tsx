import { useState, useEffect, useRef } from 'react';

export function useFontLoaded() {
  // Start false to show skeletons initially
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Safety timeout - always show content after 800ms max
    const safetyTimeout = setTimeout(() => setFontsLoaded(true), 800);

    // If no fonts API, show content immediately
    if (typeof document === 'undefined' || !document.fonts) {
      clearTimeout(safetyTimeout);
      setFontsLoaded(true);
      return;
    }

    // Check if fonts already loaded (cached)
    try {
      const fontsToCheck = ['Aeonik Pro', 'Termina'];
      const allLoaded = fontsToCheck.every(font => {
        try {
          return document.fonts.check(`16px "${font}"`);
        } catch {
          return true; // Assume loaded on error
        }
      });

      if (allLoaded) {
        clearTimeout(safetyTimeout);
        setFontsLoaded(true);
        return;
      }

      // Wait for fonts to be ready
      document.fonts.ready
        .then(() => {
          clearTimeout(safetyTimeout);
          setFontsLoaded(true);
        })
        .catch(() => {
          clearTimeout(safetyTimeout);
          setFontsLoaded(true);
        });
    } catch {
      clearTimeout(safetyTimeout);
      setFontsLoaded(true);
    }

    return () => clearTimeout(safetyTimeout);
  }, []);

  return fontsLoaded;
}

// Skeleton text component for loading state
export function TextSkeleton({ 
  className = '', 
  width = '100%',
  height = '1em',
  variant = 'default'
}: { 
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'default' | 'light';
}) {
  const bgStyle = variant === 'light' 
    ? 'linear-gradient(90deg, hsl(var(--background) / 0.15) 25%, hsl(var(--background) / 0.3) 50%, hsl(var(--background) / 0.15) 75%)'
    : 'linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 75%)';
  
  return (
    <span 
      className={`inline-block rounded animate-shimmer ${className}`}
      style={{ 
        width, 
        height,
        background: bgStyle,
        backgroundSize: '200% 100%',
      }}
      aria-hidden="true"
    />
  );
}
