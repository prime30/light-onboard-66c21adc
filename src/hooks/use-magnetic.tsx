import { useRef, useState, useCallback } from "react";

interface MagneticOptions {
  strength?: number;
}

export const useMagnetic = ({ strength = 0.3 }: MagneticOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      setTransform({ x: deltaX, y: deltaY });
    },
    [strength]
  );

  const handleMouseLeave = useCallback(() => {
    setTransform({ x: 0, y: 0 });
  }, []);

  return {
    ref,
    style: {
      transform: `translate(${transform.x}px, ${transform.y}px)`,
      transition: transform.x === 0 && transform.y === 0 ? "transform 0.3s ease-out" : "transform 0.1s ease-out",
    },
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };
};
