import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { FileUpload } from "@/components/registration/FileUpload";
import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
import { cn } from "@/lib/utils";

const salonSizes = ["1-3 stylists", "4-10 stylists", "11-25 stylists", "26+ stylists"];
const salonStructures = ["Booth Rental", "Commission-based", "Hybrid", "Owner-operated"];

interface LicenseStepProps {
  accountType: string | null;
  licenseNumber: string;
  salonSize: string;
  salonStructure: string;
  licenseFile: File | null;
  licenseProofFiles: File[];
  onLicenseChange: (value: string) => void;
  onSalonSizeChange: (value: string) => void;
  onSalonStructureChange: (value: string) => void;
  onLicenseFileChange: (file: File | null) => void;
  onLicenseProofFilesChange: (files: File[]) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}

export const LicenseStep = ({
  accountType,
  licenseNumber,
  salonSize,
  salonStructure,
  licenseFile,
  licenseProofFiles,
  onLicenseChange,
  onSalonSizeChange,
  onSalonStructureChange,
  onLicenseFileChange,
  onLicenseProofFilesChange,
  showValidationErrors = false,
  validationStatus
}: LicenseStepProps) => {
  const isSalon = accountType === "salon";
  const licenseError = showValidationErrors && licenseNumber.trim() === "";
  const salonSizeError = showValidationErrors && isSalon && salonSize === "";
  const salonStructureError = showValidationErrors && isSalon && salonStructure === "";
  const stepNumber = accountType === "professional" ? 5 : 4; // professional=5, salon=4

  return (
    <div className="space-y-5 sm:space-y-[30px]">
      <div className="space-y-[10px] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {stepNumber}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          Provide your license number
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          {isSalon ? "Let us make sure you are a salon manager" : "Enter your cosmetology license details"}
        </p>
      </div>

      <div className="flex gap-[15px] pl-5 border-l-2 border-border animate-stagger-2">
        <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground/70 leading-relaxed">
          {isSalon ? "Wholesale pricing shown is exclusive to verified professionals." : "Please enter your license exactly as it appears from the state."}
        </p>
      </div>

      <div className="space-y-5">
        {/* License Number */}
        <div className="space-y-2.5">
          <Label htmlFor="license" className={cn("text-sm font-medium label-float", licenseError && "text-destructive")}>
            {isSalon ? "Salon License #*" : "License number*"}
          </Label>
          <div className="relative group input-glow rounded-form">
            <Input id="license" type="text" placeholder={isSalon ? "Salon License #" : "Enter your license number"} value={licenseNumber} onChange={e => onLicenseChange(e.target.value)} className={cn("h-button py-0 rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus", licenseError && "border-destructive/50 bg-destructive/5")} />
          </div>
          {licenseError && <p className="text-xs text-destructive">License number is required</p>}
        </div>

        {/* Salon-specific fields */}
        {isSalon && <>
            {/* Salon Size */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4" data-field="salon-size">
              <Label className={cn("text-sm font-medium", salonSizeError && "text-destructive")}>
                What's the size of your salon?*
              </Label>
              <div className="flex flex-col gap-1">
                <Select value={salonSize} onValueChange={onSalonSizeChange}>
                  <SelectTrigger className={cn("w-full sm:w-[180px] h-input rounded-form border-border/50 bg-muted transition-all duration-300", salonSizeError && "border-destructive/50 bg-destructive/5")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-form bg-background border border-border z-50">
                    {salonSizes.map(size => <SelectItem key={size} value={size} className="rounded-form-sm transition-colors duration-200 hover:bg-muted/80">
                        {size}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                {salonSizeError && <p className="text-xs text-destructive">Required</p>}
              </div>
            </div>

            {/* Salon Structure */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4" data-field="salon-structure">
              <Label className={cn("text-sm font-medium", salonStructureError && "text-destructive")}>
                Select your salon structure*
              </Label>
              <div className="flex flex-col gap-1">
                <Select value={salonStructure} onValueChange={onSalonStructureChange}>
                  <SelectTrigger className={cn("w-full sm:w-[180px] h-input rounded-form border-border/50 bg-muted transition-all duration-300", salonStructureError && "border-destructive/50 bg-destructive/5")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-form bg-background border border-border z-50">
                    {salonStructures.map(structure => <SelectItem key={structure} value={structure} className="rounded-form-sm transition-colors duration-200 hover:bg-muted/80">
                        {structure}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                {salonStructureError && <p className="text-xs text-destructive">Required</p>}
              </div>
            </div>

            {/* File Upload */}
            <FileUpload file={licenseFile} onFileChange={onLicenseFileChange} placeholder="Upload your salon license" />
          </>}

        {/* Professional-specific file upload (optional) - shows after 3+ characters in license number */}
        {!isSalon && <div className={cn(
          "grid transition-all duration-400",
          licenseNumber.trim().length >= 3 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )} style={{ transitionTimingFunction: licenseNumber.trim().length >= 3 ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out' }}>
          <div className="overflow-hidden">
            <div className={cn("space-y-2.5", licenseNumber.trim().length >= 3 && "animate-haptic-pop")}>
              <Label className="text-sm font-medium">
                Upload license photo <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <MultiFileUpload files={licenseProofFiles} onFilesChange={onLicenseProofFilesChange} placeholder="Upload photos of your license" maxFiles={3} />
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
};
