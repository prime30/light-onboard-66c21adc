import { useState, useEffect, useRef } from 'react';

const DEFAULT_FONTS = ['Aeonik Pro', 'Termina'];

export function useFontLoaded(fontFamilies: string[] = DEFAULT_FONTS) {
  // Start true to ensure content is always visible - skeleton is progressive enhancement
  const [fontsLoaded, setFontsLoaded] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only run once
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Check if fonts API is available
    if (typeof document === 'undefined' || !document.fonts) {
      return;
    }

    // Quick check if fonts are already loaded
    try {
      const allLoaded = fontFamilies.every(font => 
        document.fonts.check(`16px "${font}"`)
      );
      
      if (allLoaded) {
        return; // Already loaded, keep fontsLoaded = true
      }

      // Fonts not loaded yet - show skeleton briefly
      setFontsLoaded(false);

      // Wait for fonts with a short timeout
      const timeout = setTimeout(() => setFontsLoaded(true), 1500);
      
      document.fonts.ready.then(() => {
        clearTimeout(timeout);
        setFontsLoaded(true);
      }).catch(() => {
        clearTimeout(timeout);
        setFontsLoaded(true);
      });

      return () => clearTimeout(timeout);
    } catch {
      // Any error - just show content
      setFontsLoaded(true);
    }
  }, []); // Empty deps - only run once

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
