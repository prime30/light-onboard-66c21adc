import { GraduationCap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
// import { StateIcon, hasStateIcon } from "@/components/StateIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { cn } from "@/lib/utils";
import { useForm } from "../context";
import { UploadFileItem } from "@/contexts";
import { states, provinces } from "@/data/locations";

// Combine and sort US states and Canadian provinces alphabetically
const allLocations = [...states, ...provinces].map((location) => location.name).sort();

function SchoolNamePrefixIcon({ error }: { error: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <GraduationCap
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-background transition-all duration-300 icon-haptic",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      />
    </div>
  );
}

export const SchoolInfoStep = () => {
  const {
    register,
    control,
    watch,
    setValue,
    errors: rawErrors,
    getValidationStatus,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
    showValidationErrors,
  } = useForm();

  // Cast errors to any to handle discriminated union field access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = rawErrors as any;

  const validationStatus = getStepValidationStatus(currentStep);

  // Watch form values
  const [enrollmentProofFiles] = watch(["enrollmentProofFiles"]);

  // Create location options with icons
  const locationOptions = allLocations.map((location) => ({
    value: location,
    label: (
      <div className="flex items-center gap-2.5">
        {/*{hasStateIcon(location) && <StateIcon state={location} className="w-4 h-4" />}*/}
        <span>{location}</span>
      </div>
    ),
  }));

  // Handle file upload
  const handleEnrollmentProofFilesChange = (files: UploadFileItem[]) => {
    setValue("enrollmentProofFiles", files, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-[clamp(12px,2vh,25px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber(currentStep)}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          What cosmetology school do you attend?
        </h1>
      </div>

      <div className="space-y-5 animate-stagger-2">
        {/* School/Apprenticeship Name */}
        <div className="animate-stagger-2">
          <TextInput
            name="schoolName"
            type="text"
            register={register}
            error={errors.schoolName}
            placeholder="Enter your school or apprenticeship name"
            label="School/Apprenticeship Name*"
            isValid={getValidationStatus("schoolName") === "complete"}
            prefixIcon={<SchoolNamePrefixIcon error={!!errors.schoolName} />}
          />
        </div>

        {/* State/Province */}
        <div className="animate-stagger-3">
          <SelectInput
            name="schoolState"
            control={control}
            error={errors.schoolState}
            options={locationOptions}
            label="State/Province*"
            placeholder="Select your state/province"
            isValid={getValidationStatus("schoolState") === "complete"}
          />
        </div>

        {/* Multi-File Upload */}
        <div className="space-y-2.5 animate-stagger-4">
          <Label className="text-sm font-medium">
            Upload proof of enrollment or apprenticeship*
          </Label>
          <p className="text-xs text-muted-foreground">
            Upload school ID, apprenticeship license, enrollment letter, etc.
          </p>
          <div data-field="enrollment-proof">
            <MultiFileUpload
              files={(enrollmentProofFiles || []) as { id: string; file: File; status: "completed" | "error" | "pending" | "uploading"; progress: number; error?: string; url?: string; }[]}
              onFilesChange={handleEnrollmentProofFilesChange}
              placeholder="Upload your documents"
              maxFiles={5}
              error={
                showValidationErrors && (!enrollmentProofFiles || enrollmentProofFiles.length === 0)
              }
              errorMessage="Please upload at least one proof of enrollment or apprenticeship"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
