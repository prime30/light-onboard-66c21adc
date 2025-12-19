import { useState, useEffect, useRef } from "react";
import { Building2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { StateIcon, hasStateIcon } from "@/components/StateIcon";
import { cn } from "@/lib/utils";

export const countries = ["United States", "Canada"];
export const provinces = ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon"];
export const states = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];

interface BusinessLocationStepProps {
  accountType: string | null;
  businessName: string;
  businessAddress: string;
  suiteNumber: string;
  country: string;
  city: string;
  state: string;
  zipCode: string;
  onBusinessNameChange: (value: string) => void;
  onBusinessAddressChange: (value: string) => void;
  onSuiteNumberChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onZipCodeChange: (value: string) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}

export const BusinessLocationStep = ({
  accountType,
  businessName,
  businessAddress,
  suiteNumber,
  country,
  city,
  state,
  zipCode,
  onBusinessNameChange,
  onBusinessAddressChange,
  onSuiteNumberChange,
  onCountryChange,
  onCityChange,
  onStateChange,
  onZipCodeChange,
  showValidationErrors = false,
  validationStatus
}: BusinessLocationStepProps) => {
  const [predictions, setPredictions] = useState<Array<{ description: string; place_id: string }>>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [sessionToken] = useState(() => crypto.randomUUID());
  const addressInputRef = useRef<HTMLInputElement>(null);
  const predictionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const businessNameError = showValidationErrors && businessName.trim() === "";
  const businessAddressError = showValidationErrors && businessAddress.trim() === "";
  const countryError = showValidationErrors && country === "";
  const cityError = showValidationErrors && city.trim() === "";
  const stateError = showValidationErrors && state === "";
  const zipCodeError = showValidationErrors && zipCode.trim() === "";
  const isStudent = accountType === "student";
  const stepNumber = accountType === "professional" ? 4 : 2; // professional=4, salon=2

  // Fetch address predictions
  const fetchPredictions = async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoadingPredictions(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/address-autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          input,
          sessionToken,
          country: country || undefined,
        }),
      });

      const data = await response.json();
      if (data.predictions) {
        setPredictions(data.predictions);
        setShowPredictions(data.predictions.length > 0);
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
      setPredictions([]);
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  // Fetch place details and auto-fill form
  const selectPrediction = async (placeId: string, description: string) => {
    setShowPredictions(false);
    onBusinessAddressChange(description);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/address-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          placeId,
          sessionToken,
        }),
      });

      const data = await response.json();
      if (data.details) {
        const { streetAddress, city: detailCity, state: detailState, country: detailCountry, postalCode } = data.details;
        
        // Update form fields with parsed address
        if (streetAddress) onBusinessAddressChange(streetAddress);
        if (detailCity) onCityChange(detailCity);
        if (postalCode) onZipCodeChange(postalCode);
        
        // Set country first so state dropdown updates
        if (detailCountry) {
          const mappedCountry = detailCountry === 'United States' || detailCountry === 'US' 
            ? 'United States' 
            : detailCountry === 'Canada' || detailCountry === 'CA' 
              ? 'Canada' 
              : detailCountry;
          if (countries.includes(mappedCountry)) {
            onCountryChange(mappedCountry);
          }
        }
        
        // Set state/province
        if (detailState) {
          // Try to match the full state name
          const stateList = detailCountry === 'Canada' ? provinces : states;
          const matchedState = stateList.find(s => 
            s.toLowerCase() === detailState.toLowerCase() || 
            s.toLowerCase() === data.details.stateShort?.toLowerCase()
          );
          if (matchedState) {
            onStateChange(matchedState);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  // Handle address input change with debounce
  const handleAddressChange = (value: string) => {
    onBusinessAddressChange(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  };

  // Close predictions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        predictionsRef.current && 
        !predictionsRef.current.contains(event.target as Node) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(event.target as Node)
      ) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-[25px]">
      <div className="space-y-2.5 text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {stepNumber}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          {isStudent ? "Where are you located?" : "Where is your business located?"}
        </h1>
      </div>

      <div className="space-y-5">
        {/* Business Name */}
        <div className="space-y-2.5">
          <Label htmlFor="businessName" className="text-sm font-medium label-float">
            Business or salon name*
          </Label>
          <div className="relative group input-glow input-ripple rounded-form">
            <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm bg-muted flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
              <Building2 className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
            </div>
            <Input id="businessName" type="text" placeholder="Business or salon name" value={businessName} onChange={e => onBusinessNameChange(e.target.value)} className="h-input pl-[55px] rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus" />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2.5">
          <Label htmlFor="businessAddress" className="text-sm font-medium label-float">
            Address*
          </Label>
          <div className="relative">
            <div className="relative group input-glow input-ripple rounded-form">
              <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm bg-muted flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
                <MapPin className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
              </div>
              <Input 
                ref={addressInputRef}
                id="businessAddress" 
                type="text" 
                placeholder="Start typing your address..." 
                value={businessAddress} 
                onChange={e => handleAddressChange(e.target.value)} 
                onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                autoComplete="off"
                className="h-input pl-[55px] rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus" 
              />
              {isLoadingPredictions && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            {/* Predictions Dropdown */}
            {showPredictions && predictions.length > 0 && (
              <div 
                ref={predictionsRef}
                className="absolute z-50 w-full mt-1 bg-background border border-border rounded-form shadow-lg overflow-hidden animate-fade-in"
              >
                {predictions.map((prediction, index) => (
                  <button
                    key={prediction.place_id}
                    type="button"
                    onClick={() => selectPrediction(prediction.place_id, prediction.description)}
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
            )}
          </div>
        </div>

        {/* Suite */}
        <div className="space-y-2.5">
          <Label htmlFor="suiteNumber" className="text-sm font-medium label-float">
            Suite/Unit # (optional)
          </Label>
          <div className="input-glow input-ripple rounded-form">
            <Input id="suiteNumber" type="text" placeholder="Suite, Unit, Apt #" value={suiteNumber} onChange={e => onSuiteNumberChange(e.target.value)} className="h-input rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus" />
          </div>
        </div>

        {/* Country */}
        <div className="space-y-2.5">
          <Label htmlFor="country" className="text-sm font-medium label-float">
            Country*
          </Label>
          <Select value={country} onValueChange={onCountryChange}>
            <SelectTrigger id="country" className="h-input rounded-form border-border/50 bg-muted transition-all duration-300 focus:shadow-input-focus">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent className="rounded-form bg-background border border-border z-50">
              {countries.map(c => <SelectItem key={c} value={c} className="rounded-form-sm transition-colors duration-200 hover:bg-muted/80">
                  {c}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* City + State */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-2.5">
            <Label htmlFor="city" className="text-sm font-medium label-float">
              City*
            </Label>
            <div className="input-glow input-ripple rounded-form">
              <Input id="city" type="text" placeholder="City" value={city} onChange={e => onCityChange(e.target.value)} className="h-input rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus" />
            </div>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="stateProvince" className="text-sm font-medium label-float">
              State/Province*
            </Label>
            <div className="relative">
              {state && country === "United States" && hasStateIcon(state) && <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[24px] h-[24px] flex items-center justify-center z-10">
                  <StateIcon state={state} size={22} className="text-foreground" />
                </div>}
              <Select value={state} onValueChange={onStateChange}>
                <SelectTrigger id="stateProvince" className={cn("h-input rounded-form border-border/50 bg-muted transition-all duration-300 focus:shadow-input-focus", state && country === "United States" && hasStateIcon(state) && "pl-[42px]")}
                >
                  <SelectValue placeholder={country === "Canada" ? "Province" : "State"} />
                </SelectTrigger>
                <SelectContent className="rounded-form bg-background border border-border z-50">
                  {(country === "Canada" ? provinces : states).map(s => <SelectItem key={s} value={s} className="rounded-form-sm transition-colors duration-200 hover:bg-muted/80">
                      {s}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Zip Code */}
        <div className="space-y-2.5">
          <Label htmlFor="zipCode" className="text-sm font-medium label-float">
            Zip/Postal code*
          </Label>
          <div className="input-glow input-ripple rounded-form">
            <Input id="zipCode" type="text" placeholder="Zip/Postal code" value={zipCode} onChange={e => onZipCodeChange(e.target.value)} className="h-input rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus" />
          </div>
        </div>
      </div>
    </div>
  );
};
