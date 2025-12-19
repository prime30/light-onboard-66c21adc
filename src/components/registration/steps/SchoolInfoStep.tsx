import { GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
import { StateIcon, hasStateIcon } from "@/components/StateIcon";
import { cn } from "@/lib/utils";

const states = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];

interface SchoolInfoStepProps {
  schoolName: string;
  schoolState: string;
  enrollmentProofFiles: File[];
  onSchoolNameChange: (value: string) => void;
  onSchoolStateChange: (value: string) => void;
  onEnrollmentProofFilesChange: (files: File[]) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}

export const SchoolInfoStep = ({
  schoolName,
  schoolState,
  enrollmentProofFiles,
  onSchoolNameChange,
  onSchoolStateChange,
  onEnrollmentProofFilesChange,
  showValidationErrors = false,
  validationStatus
}: SchoolInfoStepProps) => {
  const schoolNameError = showValidationErrors && schoolName.trim() === "";
  const stateError = showValidationErrors && schoolState === "";
  const fileError = showValidationErrors && enrollmentProofFiles.length === 0;

  return (
    <div className="space-y-[25px]">
      <div className="space-y-2.5 text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step 2
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          What cosmetology school do you attend?
        </h1>
      </div>

      <div className="space-y-4 animate-stagger-2">
        {/* School/Apprenticeship Name */}
        <div className="space-y-2.5">
          <Label htmlFor="schoolName" className="text-sm font-medium label-float">
            School/Apprenticeship Name*
          </Label>
          <div className="relative group input-glow input-ripple rounded-form">
            <div className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm bg-muted flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10">
              <GraduationCap className="w-[15px] h-[15px] text-muted-foreground group-focus-within:text-background transition-all duration-300 icon-haptic" />
            </div>
            <Input id="schoolName" type="text" placeholder="Enter your school or apprenticeship name" value={schoolName} onChange={e => onSchoolNameChange(e.target.value)} className={cn("h-input pl-[55px] rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", schoolNameError && "border-destructive/50")} />
          </div>
          {schoolNameError && <p className="text-xs text-destructive">School/Apprenticeship name is required</p>}
        </div>

        {/* State/Province */}
        <div className="space-y-2.5">
          <Label htmlFor="schoolState" className="text-sm font-medium label-float">
            State/Province*
          </Label>
            <div className="relative group">
              <Select value={schoolState} onValueChange={onSchoolStateChange}>
                <SelectTrigger id="schoolState" className={cn("h-input rounded-form border-border/50 bg-muted transition-all duration-300 focus:shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]", stateError && "border-destructive/50")}>
                  <SelectValue placeholder="Select your state/province" />
                </SelectTrigger>
              <SelectContent className="rounded-form bg-background border border-border z-50 max-h-[280px]">
                {states.map(s => <SelectItem key={s} value={s} className="rounded-form-sm transition-colors duration-200 hover:bg-muted/80">
                    <div className="flex items-center gap-2.5">
                      {hasStateIcon(s) && <StateIcon state={s} className="w-4 h-4" />}
                      <span>{s}</span>
                    </div>
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {stateError && <p className="text-xs text-destructive">State/Province is required</p>}
        </div>

        {/* Multi-File Upload */}
        <div className="space-y-2.5">
          <Label className="text-sm font-medium">
            Upload proof of enrollment or apprenticeship*
          </Label>
          <p className="text-xs text-muted-foreground">
            Upload school ID, apprenticeship license, enrollment letter, etc.
          </p>
          <div data-field="enrollment-proof">
            <MultiFileUpload files={enrollmentProofFiles} onFilesChange={onEnrollmentProofFilesChange} placeholder="Upload your documents" maxFiles={5} error={fileError} errorMessage="Please upload at least one proof of enrollment or apprenticeship" />
          </div>
        </div>
      </div>
    </div>
  );
};
