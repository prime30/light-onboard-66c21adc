import { GraduationCap } from "lucide-react";
import { Label } from "@/components/ui/label";

import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
// import { StateIcon, hasStateIcon } from "@/components/StateIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { cn } from "@/lib/utils";
import { useForm } from "../context";
import { UploadFileItem } from "@/contexts";
import {
  states,
  provinces,
  australianStates,
  ukNations,
  irishCounties,
  nzRegions,
  zaProvinces,
} from "@/data/locations";

// Combine and sort all English-speaking-country subdivisions alphabetically
const allLocations = [
  ...states,
  ...provinces,
  ...australianStates,
  ...ukNations,
  ...irishCounties,
  ...nzRegions,
  ...zaProvinces,
]
  .map((location) => location.name)
  .sort();

// Per-country copy for the training-institution step. Countries not listed
// fall through to the US default.
const SCHOOL_COPY: Record<
  string,
  {
    h1: string;
    schoolLabel: string;
    schoolPlaceholder: string;
    regionLabel: string;
    regionPlaceholder: string;
    uploadLabel: string;
    uploadHint: string;
  }
> = {
  US: {
    h1: "What cosmetology school do you attend?",
    schoolLabel: "School/Apprenticeship Name*",
    schoolPlaceholder: "Enter your school or apprenticeship name",
    regionLabel: "State/Province*",
    regionPlaceholder: "Select your state/province",
    uploadLabel: "Upload proof of enrollment or apprenticeship*",
    uploadHint: "Upload school ID, apprenticeship license, enrollment letter, etc.",
  },
  CA: {
    h1: "What cosmetology school do you attend?",
    schoolLabel: "School/Apprenticeship Name*",
    schoolPlaceholder: "Enter your school or apprenticeship name",
    regionLabel: "Province/Territory*",
    regionPlaceholder: "Select your province/territory",
    uploadLabel: "Upload proof of enrollment or apprenticeship*",
    uploadHint: "Upload school ID, apprenticeship license, enrollment letter, etc.",
  },
  AU: {
    h1: "Which TAFE or RTO do you attend?",
    schoolLabel: "TAFE / RTO name*",
    schoolPlaceholder: "Enter your TAFE or RTO name",
    regionLabel: "State/Territory*",
    regionPlaceholder: "Select your state/territory",
    uploadLabel: "Upload proof of enrollment*",
    uploadHint: "Upload your TAFE/RTO student ID, enrollment letter, or apprenticeship agreement.",
  },
  UK: {
    h1: "Which college or academy do you attend?",
    schoolLabel: "College / academy name*",
    schoolPlaceholder: "Enter your college or academy name",
    regionLabel: "Nation*",
    regionPlaceholder: "Select your nation",
    uploadLabel: "Upload proof of enrollment*",
    uploadHint: "Upload your college ID, NVQ enrollment letter, or apprenticeship agreement.",
  },
  IE: {
    h1: "Which college or ETB centre do you attend?",
    schoolLabel: "College / ETB centre name*",
    schoolPlaceholder: "Enter your college or ETB centre name",
    regionLabel: "County*",
    regionPlaceholder: "Select your county",
    uploadLabel: "Upload proof of enrollment*",
    uploadHint: "Upload your student ID, QQI enrollment letter, or apprenticeship agreement.",
  },
  NZ: {
    h1: "Which polytechnic or ITO do you train with?",
    schoolLabel: "Polytechnic / ITO name*",
    schoolPlaceholder: "Enter your polytechnic or ITO name",
    regionLabel: "Region*",
    regionPlaceholder: "Select your region",
    uploadLabel: "Upload proof of enrollment*",
    uploadHint: "Upload your student ID, enrollment letter, or apprenticeship agreement.",
  },
  ZA: {
    h1: "Which academy or TVET college do you attend?",
    schoolLabel: "Academy / TVET college name*",
    schoolPlaceholder: "Enter your academy or TVET college name",
    regionLabel: "Province*",
    regionPlaceholder: "Select your province",
    uploadLabel: "Upload proof of enrollment*",
    uploadHint: "Upload your student ID, learnership agreement, or enrollment letter.",
  },
};

function SchoolNamePrefixIcon({ error }: { error: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <GraduationCap
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-foreground transition-all duration-300 icon-haptic",
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

  

  // Watch form values
  const [enrollmentProofFiles, countryCode] = watch(["enrollmentProofFiles", "countryCode"]);
  const country = (countryCode ?? "US").toUpperCase();
  const copy = SCHOOL_COPY[country] ?? SCHOOL_COPY.US;

  // Create location options with icons
  const locationOptions = allLocations.map((location) => ({
    value: location,
    label: (
      <div className="flex items-center gap-2.5">
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
        <div className="animate-stagger-1" />
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          {copy.h1}
        </h1>
      </div>

      <div className="space-y-5 animate-stagger-2">
        <div className="animate-stagger-2">
          <TextInput
            name="schoolName"
            type="text"
            register={register}
            error={errors.schoolName}
            placeholder={copy.schoolPlaceholder}
            label={copy.schoolLabel}
            isValid={getValidationStatus("schoolName") === "complete"}
            prefixIcon={<SchoolNamePrefixIcon error={!!errors.schoolName} />}
          />
        </div>

        <div className="animate-stagger-3">
          <SelectInput
            name="schoolState"
            control={control}
            error={errors.schoolState}
            options={locationOptions}
            label={copy.regionLabel}
            placeholder={copy.regionPlaceholder}
            isValid={getValidationStatus("schoolState") === "complete"}
          />
        </div>

        <div className="space-y-2.5 animate-stagger-4">
          <Label className="text-sm font-medium">{copy.uploadLabel}</Label>
          <p className="text-xs text-muted-foreground">{copy.uploadHint}</p>
          <div data-field="enrollment-proof">
            <MultiFileUpload
              files={
                (enrollmentProofFiles || []) as {
                  id: string;
                  file: File;
                  status: "completed" | "error" | "pending" | "uploading";
                  progress: number;
                  error?: string;
                  url?: string;
                }[]
              }
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
