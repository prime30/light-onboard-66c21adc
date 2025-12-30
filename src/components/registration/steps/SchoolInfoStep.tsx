import { GraduationCap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
import { StateIcon, hasStateIcon } from "@/components/StateIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { cn } from "@/lib/utils";
import { useForm } from "../context";
import { UploadFileItem } from "@/contexts";

const states = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

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
    errors,
    getValidationStatus,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
    showValidationErrors,
  } = useForm();

  const validationStatus = getStepValidationStatus(currentStep);

  // Watch form values
  const [enrollmentProofFiles] = watch(["enrollmentProofFiles"]);

  // Create state options with icons
  const stateOptions = states.map((state) => ({
    value: state,
    label: (
      <div className="flex items-center gap-2.5">
        {hasStateIcon(state) && <StateIcon state={state} className="w-4 h-4" />}
        <span>{state}</span>
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
    <div className="space-y-[25px]">
      <div className="space-y-2.5 text-center animate-stagger-1">
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
            options={stateOptions}
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
              files={enrollmentProofFiles || []}
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
