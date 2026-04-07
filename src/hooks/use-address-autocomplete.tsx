import { useState, useRef, useCallback, useEffect } from "react";
import { MapPin } from "lucide-react";
import { addressService, type AddressPrediction, type AddressDetails } from "@/services/address";
import { cn } from "@/lib/utils";

export interface UseAddressAutocompleteOptions {
  onAddressSelect?: (details: AddressDetails) => void;
  countryCode?: string;
  debounceMs?: number;
}

export interface UseAddressAutocompleteReturn {
  // State
  predictions: AddressPrediction[];
  showPredictions: boolean;
  isLoading: boolean;

  // Refs for DOM elements
  inputRef: React.RefObject<HTMLInputElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;

  // Event handlers
  handleInputChange: (value: string) => void;
  handleInputFocus: () => void;
  selectPrediction: (placeId: string) => void;
  closePredictions: () => void;

  // Components
  AddressDropdown: React.ComponentType<AddressDropdownProps>;

  // Utilities
  refreshSession: () => void;
}

export interface AddressDropdownProps {
  className?: string;
}

export function useAddressAutocomplete(
  options: UseAddressAutocompleteOptions = {}
): UseAddressAutocompleteReturn {
  const { onAddressSelect, countryCode, debounceMs = 300 } = options;

  // State
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch predictions with debounce
  const fetchPredictions = useCallback(
    async (input: string) => {
      if (input.length < 3) {
        setPredictions([]);
        setShowPredictions(false);
        return;
      }

      setIsLoading(true);

      try {
        const results = await addressService.fetchPredictions(input, countryCode);
        setPredictions(results);
        setShowPredictions(results.length > 0);
      } catch (error) {
        console.error("Error fetching predictions:", error);
        setPredictions([]);
        setShowPredictions(false);
      } finally {
        setIsLoading(false);
      }
    },
    [countryCode]
  );

  // Handle input change with debounce
  const handleInputChange = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        fetchPredictions(value);
      }, debounceMs);
    },
    [fetchPredictions, debounceMs]
  );

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    if (predictions.length > 0) {
      setShowPredictions(true);
    }
  }, [predictions.length]);

  // Select a prediction and fetch details
  const selectPrediction = useCallback(
    async (placeId: string) => {
      setShowPredictions(false);

      if (onAddressSelect) {
        setIsLoading(true);

        try {
          const details = await addressService.fetchAddressDetails(placeId);
          if (details) {
            onAddressSelect(details);
          }
        } catch (error) {
          console.error("Error fetching address details:", error);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [onAddressSelect]
  );

  // Close predictions dropdown
  const closePredictions = useCallback(() => {
    setShowPredictions(false);
  }, []);

  // Refresh session token
  const refreshSession = useCallback(() => {
    addressService.refreshSession();
  }, []);

  // Click outside to close predictions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowPredictions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Reusable AddressDropdown component
  const AddressDropdown = useCallback(
    ({ className }: AddressDropdownProps) => {
      if (!showPredictions || predictions.length === 0) {
        return null;
      }

      return (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-50 w-full mt-1 bg-background border border-border rounded-form shadow-lg overflow-hidden animate-fade-in",
            className
          )}
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => selectPrediction(prediction.place_id)}
              className={cn(
                "w-full px-4 py-3 text-left text-sm hover:bg-muted/80 transition-colors duration-150 flex items-start gap-3",
                index !== predictions.length - 1 && "border-b border-border/50"
              )}
            >
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-foreground">{prediction.description}</span>
            </button>
          ))}
        </div>
      );
    },
    [showPredictions, predictions, selectPrediction]
  );

  return {
    // State
    predictions,
    showPredictions,
    isLoading,

    // Refs
    inputRef,
    dropdownRef,

    // Event handlers
    handleInputChange,
    handleInputFocus,
    selectPrediction,
    closePredictions,

    // Components
    AddressDropdown,

    // Utilities
    refreshSession,
  };
}
