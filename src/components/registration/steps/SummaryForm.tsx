import { FileCheck, ShieldCheck } from "lucide-react";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { FilePreviewGrid } from "@/components/registration/FilePreviewThumbnail";
import { useForm } from "@/components/registration/context/FormContext";

interface SummaryFormProps {
  onEditStep: (stepNum: number) => void;
}

export const SummaryForm = ({ onEditStep }: SummaryFormProps) => {
  const { watch, currentStep } = useForm();

  // Watch all form values
  const accountType = watch("accountType");
  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const preferredName = watch("preferredName");
  const email = watch("email");
  const phoneNumber = watch("phoneNumber");
  const phoneCountryCode = watch("phoneCountryCode");
  const licenseNumber = watch("licenseNumber");
  const state = watch("state");
  const businessName = watch("businessName");
  const businessAddress = watch("businessAddress");
  const suiteNumber = watch("suiteNumber");
  const city = watch("city");
  const zipCode = watch("zipCode");
  const country = watch("country");
  const schoolName = watch("schoolName");
  const schoolState = watch("schoolState");
  const businessOperationType = watch("businessOperationType");
  const salonSize = watch("salonSize");
  const salonStructure = watch("salonStructure");
  const hasTaxExemption = watch("hasTaxExemption");
  const birthdayMonth = watch("birthdayMonth");
  const birthdayDay = watch("birthdayDay");
  const socialMediaHandle = watch("socialMediaHandle");
  const subscribeOrderUpdates = watch("subscribeOrderUpdates");
  const subscribePromotions = watch("subscribePromotions");
  const uploadedFiles = watch("uploadedFiles") || [];

  const getAccountTypeLabel = () => {
    if (accountType === "professional") return "Professional Stylist";
    if (accountType === "student") return "Cosmetology Student";
    if (accountType === "salon") return "Salon / Business";
    return "";
  };

  const getBusinessOperationLabel = () => {
    if (businessOperationType === "commission") return "Commission-based (work at a salon)";
    if (businessOperationType === "independent") return "Independent (booth rent / freelance)";
    return "";
  };

  const getSalonSizeLabel = () => {
    if (salonSize === "1") return "Just me (solo)";
    if (salonSize === "2-5") return "2-5 stylists";
    if (salonSize === "6-10") return "6-10 stylists";
    if (salonSize === "11+") return "11+ stylists";
    return salonSize;
  };

  const getSalonStructureLabel = () => {
    if (salonStructure === "owner") return "I own the salon";
    if (salonStructure === "manager") return "I manage the salon";
    if (salonStructure === "booth") return "I rent a booth/chair";
    return salonStructure;
  };

  const getMonthName = (month: string) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const idx = parseInt(month, 10) - 1;
    return months[idx] || month;
  };

  const formatPhoneDisplay = () => {
    if (!phoneNumber) return "";
    return `${phoneCountryCode} ${phoneNumber}`;
  };

  const SummarySection = ({
    title,
    stepNum,
    children,
  }: {
    title: string;
    stepNum: number;
    children: React.ReactNode;
  }) => (
    <div className="space-y-2 p-4 rounded-form bg-muted border border-border/50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <button
          type="button"
          onClick={() => onEditStep(stepNum)}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Edit
        </button>
      </div>
      <div className="space-y-1.5 text-sm text-muted-foreground">{children}</div>
    </div>
  );

  const SummaryRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground/70">{label}</span>
        <span className="text-foreground text-right">{value}</span>
      </div>
    );
  };

  return (
    <div className="space-y-[25px]">
      <div className="space-y-2.5 text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status="complete" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {currentStep}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          Review Your Application
        </h1>
      </div>

      {/* Security Note */}
      <div className="flex items-center gap-3 p-4 rounded-form bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 animate-stagger-2">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Your information is secure and never shared with third parties.
        </p>
      </div>

      <div className="space-y-3">
        {/* Account Type */}
        <div className="animate-stagger-2">
          <SummarySection title="Account Type" stepNum={1}>
            <SummaryRow label="Type" value={getAccountTypeLabel()} />
          </SummarySection>
        </div>

        {/* Contact Information */}
        <div className="animate-stagger-3">
          <SummarySection
            title="Contact Information"
            stepNum={accountType === "student" ? 3 : accountType === "professional" ? 3 : 3}
          >
            <SummaryRow label="Name" value={`${firstName} ${lastName}`} />
            {preferredName && <SummaryRow label="Preferred Name" value={preferredName} />}
            <SummaryRow label="Email" value={email} />
            <SummaryRow label="Phone" value={formatPhoneDisplay()} />
          </SummarySection>
        </div>

        {/* Business Operation (Professional only) */}
        {accountType === "professional" && (
          <div className="animate-stagger-4">
            <SummarySection title="Business Operation" stepNum={2}>
              <SummaryRow label="Type" value={getBusinessOperationLabel()} />
            </SummarySection>
          </div>
        )}

        {/* School Information (Student only) */}
        {accountType === "student" && (
          <div className="animate-stagger-4">
            <SummarySection title="School Information" stepNum={2}>
              <SummaryRow label="School" value={schoolName} />
              <SummaryRow label="State" value={schoolState} />
            </SummarySection>
          </div>
        )}

        {/* License Information */}
        {accountType !== "student" && (
          <div className="animate-stagger-5">
            <SummarySection
              title="License Information"
              stepNum={accountType === "professional" ? 4 : 4}
            >
              <SummaryRow label="License Number" value={licenseNumber} />
              {state && <SummaryRow label="State" value={state} />}
              {accountType === "salon" && (
                <>
                  <SummaryRow label="Salon Size" value={getSalonSizeLabel()} />
                  <SummaryRow label="Structure" value={getSalonStructureLabel()} />
                </>
              )}
            </SummarySection>
          </div>
        )}

        {/* Business Location */}
        {(accountType === "professional" || accountType === "salon") && (
          <div className="animate-stagger-6">
            <SummarySection
              title="Business Location"
              stepNum={accountType === "professional" ? 5 : 2}
            >
              <SummaryRow label="Business Name" value={businessName} />
              <SummaryRow
                label="Address"
                value={suiteNumber ? `${businessAddress}, ${suiteNumber}` : businessAddress}
              />
              <SummaryRow label="City" value={`${city}, ${state} ${zipCode}`} />
              <SummaryRow label="Country" value={country} />
            </SummarySection>
          </div>
        )}

        {/* Tax Exemption */}
        <div className="animate-stagger-7">
          <SummarySection
            title="Tax Exemption"
            stepNum={accountType === "professional" ? 6 : accountType === "student" ? 4 : 5}
          >
            <SummaryRow
              label="Status"
              value={
                hasTaxExemption === true
                  ? "Tax exempt"
                  : hasTaxExemption === false
                    ? "Not tax exempt"
                    : "Not specified"
              }
            />
          </SummarySection>
        </div>

        {/* Preferences */}
        <div className="animate-stagger-8">
          <SummarySection
            title="Preferences & Details"
            stepNum={accountType === "professional" ? 8 : accountType === "student" ? 6 : 7}
          >
            {birthdayMonth && birthdayDay && (
              <SummaryRow
                label="Birthday"
                value={`${getMonthName(birthdayMonth)} ${parseInt(birthdayDay, 10)}`}
              />
            )}
            {socialMediaHandle && (
              <SummaryRow label="Social Media" value={`@${socialMediaHandle}`} />
            )}
            <SummaryRow label="Order Updates" value={subscribeOrderUpdates ? "Yes" : "No"} />
            <SummaryRow label="Promotions" value={subscribePromotions ? "Yes" : "No"} />
          </SummarySection>
        </div>

        {/* Uploaded Documents */}
        {uploadedFiles.length > 0 && (
          <div className="animate-stagger-9">
            <div className="space-y-3 p-4 rounded-form bg-muted border border-border/50">
              <span className="text-sm font-medium text-foreground">Uploaded Documents</span>
              <FilePreviewGrid files={uploadedFiles} size="md" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
