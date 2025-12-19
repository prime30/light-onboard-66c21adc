import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  progress: number;
}

export const CircularProgress = ({ progress }: CircularProgressProps) => {
  const [showGlow, setShowGlow] = useState(false);
  const prevProgressRef = useRef(progress);
  const size = 40;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress / 100 * circumference;

  // Trigger glow once when reaching 100%
  useEffect(() => {
    if (progress >= 100 && prevProgressRef.current < 100) {
      setShowGlow(true);
      const timer = setTimeout(() => {
        setShowGlow(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
    prevProgressRef.current = progress;
  }, [progress]);

  // Color based on progress: green when complete, amber when partial, white/gray when empty
  const getProgressColor = () => {
    if (progress >= 100) return "hsl(142, 76%, 45%)"; // Green
    if (progress > 0) return "hsl(38, 92%, 55%)"; // Amber
    return "rgba(255, 255, 255, 0.3)";
  };
  
  const getTextColor = () => {
    if (progress >= 100) return "hsl(142, 76%, 45%)";
    if (progress > 0) return "hsl(38, 92%, 55%)";
    return "rgba(255, 255, 255, 0.6)";
  };
  
  return (
    <div className={cn("relative flex items-center justify-center", showGlow && "animate-celebration-bounce")}>
      {/* Pulsating glow effect - shows once on reaching 100% */}
      {showGlow && <div className="absolute inset-[-8px] rounded-full animate-celebration-glow" />}
      
      <svg width={size} height={size} className="transform -rotate-90 relative z-10">
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth={strokeWidth} />
        {/* Progress circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={getProgressColor()} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500 ease-out" />
      </svg>
      <span className="absolute text-[10px] font-semibold transition-colors duration-500 z-10" style={{
        color: getTextColor()
      }}>
        {Math.round(progress)}%
      </span>
    </div>
  );
};
