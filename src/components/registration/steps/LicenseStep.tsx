import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";

interface LicenseStepProps {
  licenseNumber: string;
  state: string;
  onLicenseChange: (value: string) => void;
  onStateChange: (value: string) => void;
}

const states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
];

export const LicenseStep = ({
  licenseNumber,
  state,
  onLicenseChange,
  onStateChange,
}: LicenseStepProps) => {
  return (
    <div className="animate-slide-in-right max-w-md mx-auto">
      <div className="text-center mb-8">
        <p className="text-sm text-muted-foreground mb-2">Step 2 of 3</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          Provide your license number
        </h1>
      </div>

      {/* Info box */}
      <div className="flex gap-3 p-4 rounded-xl bg-info mb-6">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          We display professional wholesale pricing. Please enter your license exactly as it appears from the state.
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="license" className="text-sm font-medium">
            Cosmetology license number
          </Label>
          <Input
            id="license"
            type="text"
            placeholder="Enter your license number"
            value={licenseNumber}
            onChange={(e) => onLicenseChange(e.target.value)}
            className="h-12 rounded-xl border-border bg-card px-4"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state" className="text-sm font-medium">
            State / Province
          </Label>
          <Select value={state} onValueChange={onStateChange}>
            <SelectTrigger className="h-12 rounded-xl border-border bg-card px-4">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {states.map((s) => (
                <SelectItem key={s} value={s} className="rounded-lg">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
