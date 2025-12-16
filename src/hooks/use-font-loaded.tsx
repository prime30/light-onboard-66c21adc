import { useState, useEffect } from 'react';

export function useFontLoaded(fontFamilies: string[] = ['Aeonik Pro', 'Termina']) {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Check if fonts API is available
    if (!document.fonts) {
      setFontsLoaded(true);
      return;
    }

    // Check if fonts are already loaded
    const checkFonts = async () => {
      try {
        const fontChecks = fontFamilies.map(font => 
          document.fonts.check(`16px "${font}"`)
        );
        
        if (fontChecks.every(Boolean)) {
          setFontsLoaded(true);
          return;
        }

        // Wait for fonts to load
        await document.fonts.ready;
        
        // Double-check after ready
        const allLoaded = fontFamilies.every(font => 
          document.fonts.check(`16px "${font}"`)
        );
        
        setFontsLoaded(allLoaded);
        
        // Fallback timeout in case fonts fail to load
        if (!allLoaded) {
          setTimeout(() => setFontsLoaded(true), 2000);
        }
      } catch {
        // Fallback if something goes wrong
        setFontsLoaded(true);
      }
    };

    checkFonts();
  }, [fontFamilies]);

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
