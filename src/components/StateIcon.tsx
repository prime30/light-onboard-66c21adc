import { cn } from "@/lib/utils";

// Simplified state outline paths (approximations for visual representation)
const statePaths: Record<string, string> = {
  "Alabama": "M12 2L8 6L6 12L8 18L10 22L14 22L16 18L18 12L16 6L12 2Z",
  "Alaska": "M2 12L6 8L12 6L18 8L22 12L20 16L16 18L10 20L4 18L2 12Z",
  "Arizona": "M4 4L8 2L16 2L20 4L20 20L16 22L8 22L4 20L4 4Z M8 16L12 14L16 16",
  "Arkansas": "M4 4L20 4L20 20L4 20L4 4Z M8 8L16 8L16 16L8 16L8 8Z",
  "California": "M8 2L4 8L2 14L4 20L8 22L12 20L14 14L12 8L8 2Z",
  "Colorado": "M4 6L20 6L20 18L4 18L4 6Z",
  "Connecticut": "M4 8L20 6L20 16L4 18L4 8Z",
  "Delaware": "M10 2L14 4L16 12L14 20L10 22L8 14L10 2Z",
  "Florida": "M4 4L16 2L20 8L18 14L14 18L8 22L4 18L6 12L4 4Z",
  "Georgia": "M8 2L16 2L20 8L18 16L14 22L10 22L6 16L4 8L8 2Z",
  "Hawaii": "M2 10L6 8L10 10L14 8L18 10L22 12L18 14L14 16L10 14L6 16L2 14L2 10Z",
  "Idaho": "M8 2L16 2L18 8L16 14L18 20L14 22L10 22L6 20L8 14L6 8L8 2Z",
  "Illinois": "M10 2L14 2L16 8L18 14L16 20L12 22L8 20L6 14L8 8L10 2Z",
  "Indiana": "M8 2L16 2L18 10L16 18L12 22L8 18L6 10L8 2Z",
  "Iowa": "M4 6L20 6L20 18L4 18L4 6Z",
  "Kansas": "M2 6L22 6L22 18L2 18L2 6Z",
  "Kentucky": "M2 8L22 6L22 14L18 18L14 16L10 18L6 16L2 14L2 8Z",
  "Louisiana": "M4 4L16 2L20 8L18 14L20 20L14 22L8 20L4 14L4 4Z",
  "Maine": "M12 2L16 6L18 12L16 18L12 22L8 18L6 12L8 6L12 2Z",
  "Maryland": "M2 8L22 6L22 14L18 18L14 14L10 18L6 14L2 12L2 8Z",
  "Massachusetts": "M2 8L22 8L22 16L2 16L2 8Z",
  "Michigan": "M6 2L12 4L18 2L20 8L18 14L20 20L14 22L10 20L6 22L4 16L6 10L4 4L6 2Z",
  "Minnesota": "M8 2L16 2L18 8L20 14L18 20L12 22L6 20L4 14L6 8L8 2Z",
  "Mississippi": "M10 2L14 2L16 8L16 14L14 20L12 22L10 20L8 14L8 8L10 2Z",
  "Missouri": "M4 4L20 4L20 10L18 14L20 18L16 22L8 22L4 18L6 14L4 10L4 4Z",
  "Montana": "M2 6L22 4L22 16L2 18L2 6Z",
  "Nebraska": "M2 6L22 6L22 18L2 18L2 6Z M6 10L18 10",
  "Nevada": "M6 2L18 2L20 8L18 14L20 20L16 22L8 22L4 20L6 14L4 8L6 2Z",
  "New Hampshire": "M10 2L14 2L16 10L14 18L12 22L10 18L8 10L10 2Z",
  "New Jersey": "M10 2L14 4L16 10L14 16L12 22L10 18L8 12L10 2Z",
  "New Mexico": "M4 4L20 4L20 20L4 20L4 4Z",
  "New York": "M2 6L14 4L22 6L22 12L18 16L14 14L10 18L6 16L2 12L2 6Z",
  "North Carolina": "M2 8L22 6L22 14L18 18L2 16L2 8Z",
  "North Dakota": "M4 6L20 6L20 18L4 18L4 6Z",
  "Ohio": "M8 2L16 2L20 8L18 16L14 22L10 22L6 16L4 8L8 2Z",
  "Oklahoma": "M2 6L16 6L22 4L22 12L16 14L22 18L16 22L8 20L2 18L2 6Z",
  "Oregon": "M4 6L20 4L20 18L4 20L4 6Z",
  "Pennsylvania": "M2 6L22 6L22 18L2 18L2 6Z",
  "Rhode Island": "M8 4L16 4L16 20L8 20L8 4Z",
  "South Carolina": "M4 6L20 4L22 12L18 18L10 22L4 18L4 6Z",
  "South Dakota": "M4 6L20 6L20 18L4 18L4 6Z",
  "Tennessee": "M2 8L22 6L22 14L18 18L2 16L2 8Z",
  "Texas": "M6 2L18 2L22 8L20 14L22 20L16 22L12 20L8 22L2 20L4 14L2 8L6 2Z",
  "Utah": "M6 4L18 4L18 14L14 14L14 20L6 20L6 4Z",
  "Vermont": "M10 2L14 2L16 10L14 18L12 22L10 18L8 10L10 2Z",
  "Virginia": "M2 8L22 6L22 12L16 16L22 18L18 22L10 18L2 14L2 8Z",
  "Washington": "M4 6L20 4L20 18L4 20L4 6Z",
  "West Virginia": "M8 2L16 4L18 10L16 16L18 22L12 20L8 22L6 16L8 10L6 4L8 2Z",
  "Wisconsin": "M8 2L16 2L18 8L20 14L16 20L10 22L6 18L4 12L6 6L8 2Z",
  "Wyoming": "M4 4L20 4L20 20L4 20L4 4Z"
};

interface StateIconProps {
  state: string;
  className?: string;
  size?: number;
}

export const StateIcon = ({ state, className, size = 15 }: StateIconProps) => {
  const path = statePaths[state];
  
  if (!path) {
    return null;
  }
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("transition-all duration-300", className)}
    >
      <path d={path} />
    </svg>
  );
};

export const hasStateIcon = (state: string): boolean => {
  return state in statePaths;
};
