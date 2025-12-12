import { Info, Gift, Truck, DollarSign, Clock, Award, Percent, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountType } from "./AccountTypeCard";

interface LicenseStepProps {
  accountType: AccountType;
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

const accountPerks = {
  stylist: [
    { icon: Gift, text: "Earn 1x rewards points on every dollar" },
    { icon: Truck, text: "Free 2-Day shipping on qualifying orders" },
    { icon: DollarSign, text: "Professional-only wholesale pricing not available to the general public" },
    { icon: Clock, text: "Track orders, purchase history, and tax exemption available" },
    { icon: Award, text: "More perks available dependent on order volume" },
  ],
  salon: [
    { icon: Gift, text: "1.25x rewards points multiplier" },
    { icon: Truck, text: "Free 2-Day shipping on qualifying orders" },
    { icon: Clock, text: "Track orders, purchase history, and tax exemption available" },
    { icon: Percent, text: "Discounts on Tools, Education, and Displays" },
  ],
  student: [
    { icon: GraduationCap, text: "Education and training discounts" },
    { icon: Truck, text: "Free ground shipping on qualifying orders" },
    { icon: Clock, text: "Track orders, purchase history, and tax exemption available" },
    { icon: DollarSign, text: "Student discounts" },
  ],
};

const accountTitles = {
  stylist: "Create your stylist account",
  salon: "Create your salon manager account",
  student: "Create your student account",
};

export function LicenseStep({
  accountType,
  licenseNumber,
  state,
  onLicenseChange,
  onStateChange,
}: LicenseStepProps) {
  const perks = accountPerks[accountType];
  const title = accountTitles[accountType];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left side - Account perks card */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 flex flex-col">
        <div className="mb-4">
          <span className="px-2 py-1 text-xs font-medium border border-primary-foreground/30 rounded-md">
            Pro
          </span>
        </div>
        <h3 className="text-xl font-semibold mb-6">{title}</h3>
        
        {/* Percentage graphic */}
        <div className="flex-1 flex items-center justify-center mb-6">
          <div className="w-24 h-24 rounded-full border-4 border-primary-foreground/30 flex items-center justify-center">
            <span className="text-2xl font-bold">0 %</span>
          </div>
        </div>

        {/* Perks list */}
        <ul className="space-y-3">
          {perks.map((perk, index) => (
            <li key={index} className="flex items-start gap-3">
              <perk.icon className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-80" />
              <span className="text-sm opacity-90">{perk.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right side - License form */}
      <div className="bg-secondary/50 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-foreground mb-4 text-center">
          What's your license number?
        </h3>

        {/* Info box */}
        <div className="bg-card rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                We are a manufacturer and supplier of professional products. The prices displayed reflect professional wholesale pricing, not available to the general public.
              </p>
              <p>
                If you are not a licensed stylist, please reach out to your preferred stylist and ask them to create a professional account so that they may order for you.
              </p>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-3">
              <Input
                placeholder="Cosmetology license number*"
                value={licenseNumber}
                onChange={(e) => onLicenseChange(e.target.value)}
                className="h-12 rounded-xl bg-card border-border placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="md:col-span-2">
              <Select value={state} onValueChange={onStateChange}>
                <SelectTrigger className="h-12 rounded-xl bg-card border-border">
                  <SelectValue placeholder="State/Province*" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Type your license number exactly as it appears from the state including dashes, spaces and case sensitive characters.
          </p>
        </div>
      </div>
    </div>
  );
}
