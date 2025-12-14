import { cn } from "@/lib/utils";

// More accurate state outline paths (simplified but recognizable)
const statePaths: Record<string, string> = {
  "Alabama": "M6 3h10l1 3v4l-1 4v4l-2 3-1 2h-4l-1-2-1-3v-5l-1-4V6l0-3z",
  "Alaska": "M2 8l2-2 3-1 2 1 3-2 4 0 3 2 2 3-1 3-3 2-2 3-4 1-3-1-3-2-2-3 0-2 1-2z M18 16l2 1 2-1 1 2-2 2-3-1 0-3z",
  "Arizona": "M4 3h14l1 4-2 5-1 4 0 4-4 2-4 0-3-1-1-4 0-6 0-8z",
  "Arkansas": "M4 5l14-1 1 4-1 4 0 4-2 2-4 1-4 0-3-1-1-3 0-5 0-5z",
  "California": "M3 4l4-2 3 1 2 3 3 2 1 4-1 4-2 3-3 2-3 0-2-2-1-4 0-4-1-4 0-3z",
  "Colorado": "M4 5h16v14H4V5z",
  "Connecticut": "M3 7l16-1 1 5-1 5-16 1 0-5 0-5z",
  "Delaware": "M8 3l6 1 2 6 0 6-3 4-4 0-2-4 0-6 1-7z",
  "Florida": "M3 3l12 0 3 2 2 4 1 5-2 5-4 3-4 0-3-2-2-4-1-4-1-5-1-4z M14 18l3 2 2 1 1-2-2-2-4 1z",
  "Georgia": "M5 3l12 0 2 4 0 6-2 5-3 3-5 1-4-2-2-4 0-6 2-7z",
  "Hawaii": "M2 11l2-1 2 1 1 2-1 2-2 0-2-2 0-2z M8 9l2-1 2 1 0 2-2 2-2-1 0-3z M14 8l3-1 3 1 1 3-2 2-3 0-2-2 0-3z",
  "Idaho": "M6 2l8 0 3 3-1 5 2 4 0 5-3 2-4 1-4-2-2-4 1-5 0-9z",
  "Illinois": "M7 2l8 0 2 4 1 5-1 4 1 4-2 2-4 1-4-1-2-3 0-5 1-5 0-6z",
  "Indiana": "M6 3l10 0 2 4 0 6-2 5-3 2-4 0-3-2-1-5 0-5 1-5z",
  "Iowa": "M3 5l16 0 1 4-2 4 0 4-14 1-2-4 1-5 0-4z",
  "Kansas": "M2 6l18 0 1 6-1 6-18 0 0-6 0-6z",
  "Kentucky": "M2 7l5-2 5 0 5-1 4 2 1 4-3 4-5 2-5 0-4 1-3-2 0-4 0-4z",
  "Louisiana": "M4 3l10 0 3 3 2 4-1 5 2 4-3 2-5-1-4 2-4-2-1-5 0-5 1-7z",
  "Maine": "M10 2l4 1 3 4 1 5-2 5-3 3-4 0-3-3-1-5 1-5 2-3 2-2z",
  "Maryland": "M2 8l6-2 5 0 5-1 3 2 1 3-3 4-4 0-4 2-5-1-3-2-1-3 0-2z",
  "Massachusetts": "M2 8l14 0 4-1 2 2 0 4-4 2-14 0-2-3 0-4z",
  "Michigan": "M8 2l6 2 4-1 2 3-1 4 2 4-1 4-4 2-5 0-4-2-2-4 0-4-1-4 2-2 2-2z M3 13l3-1 2 2 0 3-3 2-2-2 0-4z",
  "Minnesota": "M6 2l10 0 3 4 0 6-2 4 0 4-4 2-6 0-4-3-1-5 1-5 1-4 2-3z",
  "Mississippi": "M8 2l6 0 2 4 1 6-1 5 0 4-3 1-4 0-2-3-1-5 0-5 1-4 1-3z",
  "Missouri": "M4 4l14 0 2 4-1 5 2 4-2 3-6 1-5-1-3-3-1-4 0-5 0-4z",
  "Montana": "M2 5l18-1 2 5 0 6-3 3-14 1-3-3 0-5 0-6z",
  "Nebraska": "M2 6l16-1 4 2 0 5-3 4-4 2-11 0-2-4 0-4 0-4z",
  "Nevada": "M5 2l10 0 3 5 0 6-2 5-3 3-5 0-3-4-1-6 0-5 1-4z",
  "New Hampshire": "M9 2l4 1 2 4 1 6-1 5-2 3-4 0-2-4 0-6 0-5 2-4z",
  "New Jersey": "M8 2l5 1 3 4 1 5-2 5-3 3-4 0-2-4 0-6 0-4 2-4z",
  "New Mexico": "M4 4l14 0 1 7 0 7-15 1 0-8 0-7z",
  "New York": "M2 5l6-1 6 0 5-1 3 3 0 5-4 4-5 2-6 0-4-2-2-4 0-3 1-3z",
  "North Carolina": "M2 8l6-2 8-1 5 1 2 3-1 4-4 2-8 2-6 0-3-3 0-3 1-3z",
  "North Dakota": "M4 5l14 0 2 5 0 5-16 1-1-5 1-6z",
  "Ohio": "M5 3l10 0 4 3 1 5-2 5-4 3-5 1-4-2-2-4 0-5 2-6z",
  "Oklahoma": "M2 5l6 0 6-1 4 0 3 2 1 4-4 3 2 4-4 2-4 0-4 1-4-2-2-4 0-5 0-4z",
  "Oregon": "M3 5l14-1 3 4 0 6-3 4-12 1-3-4 0-5 1-5z",
  "Pennsylvania": "M2 6l16 0 3 4 0 5-3 3-16 0-1-4 0-4 1-4z",
  "Rhode Island": "M7 4l8 0 2 6 0 6-4 2-6 0-2-4 0-6 2-4z",
  "South Carolina": "M4 5l10-1 5 2 2 5-3 5-5 3-5-1-4-3-1-5 1-5z",
  "South Dakota": "M4 5l14 0 2 5-1 5-15 1-1-5 1-6z",
  "Tennessee": "M2 8l5-2 6 0 6-1 3 2 0 4-3 3-6 1-6 1-4-1-2-3 0-2 1-2z",
  "Texas": "M5 2l6 0 5-1 4 2 2 4 0 5-2 4 2 4-3 3-4 0-5 2-4-2-3-4-1-5 0-4-1-4 2-2 2-2z",
  "Utah": "M5 4l8 0 2 4 0 5-3 0 0 5-4 2-4-2 0-7 0-4 1-3z",
  "Vermont": "M9 2l5 1 2 5 0 6-2 4-4 2-3-2-1-5 0-5 1-4 2-2z",
  "Virginia": "M2 8l5-2 6 0 6-1 4 2 0 4-5 4-6 1-5 1-4-2-2-3 0-2 1-2z",
  "Washington": "M3 5l14-1 4 4-1 5-3 3-12 1-3-3 0-5 1-4z",
  "West Virginia": "M6 3l5 0 4 2 2 4 0 4-2 4 1 3-3 2-4-1-3-3 0-4-1-4 0-4 1-3z",
  "Wisconsin": "M6 2l8 0 4 3 1 5-1 5-3 4-4 1-5-1-3-4 0-5 1-4 2-4z",
  "Wyoming": "M4 5l14 0 1 7 0 6-15 0-1-6 1-7z"
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
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
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
