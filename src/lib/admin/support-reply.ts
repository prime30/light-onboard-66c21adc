// Generates a copy-pasteable support reply from a failed registration
// submission's error_log. Keeps the wording short, specific and actionable
// so support never needs to ask the user to "open dev tools" — every
// known failure maps to a templated fix + recovery link.

const RECOVERY_BASE = "https://apply.dropdeadextensions.com/apps/apply";

type ErrorEntry = {
  step: string;
  status: string;
  message: string;
  at: string;
  // `field` is present on rows written via writeStandaloneAuditFailure and
  // the zod-issue audit block. Older rows may not carry it — fall back to
  // a step-based template.
  field?: string;
};

type SubmissionForReply = {
  email: string;
  account_type: string | null;
  status: string;
  error_log: ErrorEntry[];
};

const FIELD_LABEL: Record<string, string> = {
  email: "email address",
  phoneNumber: "phone number",
  phoneCountryCode: "phone country",
  firstName: "first name",
  lastName: "last name",
  accountType: "account type",
  schoolName: "school name",
  schoolCity: "school city",
  graduationDate: "expected graduation date",
  cosmetologyLicenseNumber: "cosmetology license number",
  licenseProofFiles: "license proof upload",
  studentIdFiles: "student ID upload",
  companyName: "salon / business name",
  addressLine1: "business address",
  countryCode: "country",
  provinceCode: "state / province",
  postalCode: "postal code",
  city: "city",
  yearsInBusiness: "years in business",
  numberOfStylists: "number of stylists",
  preferredMethods: "preferred contact method",
  termsAccepted: "wholesale terms acknowledgment",
  password: "password",
};

function labelFor(field: string | undefined): string {
  if (!field) return "the highlighted field";
  // Nested paths like address.line1 / licenseProofFiles.0 — surface the
  // top-level field name (the form renders one input per top-level field).
  const top = field.split(".")[0];
  return FIELD_LABEL[top] ?? top;
}

function recoveryLink(email: string): string {
  const u = new URL(RECOVERY_BASE);
  u.searchParams.set("email", email);
  return u.toString();
}

/**
 * Returns a multi-line support reply string ready to paste into email /
 * Front / helpdesk. Greeting + diagnosis per failure + recovery link.
 * Returns null when there's nothing to say (succeeded rows, etc.).
 */
export function buildSupportReply(s: SubmissionForReply): string | null {
  const failures = (s.error_log ?? []).filter((e) => e.status === "error");
  if (s.status === "succeeded" && failures.length === 0) return null;

  const lines: string[] = [];
  lines.push("Hi there,");
  lines.push("");
  lines.push(
    "Thanks for applying to Drop Dead Extensions — your last submission didn't go through. Here's what we saw and how to fix it:"
  );
  lines.push("");

  const seen = new Set<string>();
  for (const f of failures) {
    const key = `${f.step}|${f.field ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`• ${diagnose(f)}`);
  }

  if (failures.length === 0) {
    // Upstream succeeded only partially — surface that to the user as a
    // "we'll fix on our end" reply instead of asking them to redo work.
    if (s.status === "helium_ok" || s.status === "shopify_ok") {
      lines.push(
        "• Your application was received but didn't finish syncing to our store. We're processing it on our end — no action needed."
      );
    } else {
      lines.push("• Your application hit a temporary error during processing. Please try submitting once more.");
    }
  }

  lines.push("");
  lines.push("Pick up where you left off here — your details are still saved:");
  lines.push(recoveryLink(s.email));
  lines.push("");
  lines.push("Reply to this email if you'd like us to walk through it with you.");
  lines.push("");
  lines.push("— Drop Dead Extensions");

  return lines.join("\n");
}

function diagnose(f: ErrorEntry): string {
  const field = labelFor(f.field);
  switch (f.step) {
    case "disposable_email":
      return "We can't accept disposable / temporary email addresses (mailinator, tempmail, etc). Please re-apply with your business email.";
    case "email_already_applied":
      return "You've already applied with this email. Sign in instead at apply.dropdeadextensions.com/login — no need to re-apply.";
    case "phone_invalid":
      return `Your ${field} didn't match a valid format for the country you selected. Double-check the digits and country code.`;
    case "phone_in_use":
      return `Your ${field} is already linked to another customer account. Use a different number, or reply to this email and we can merge the accounts.`;
    case "helium_create":
    case "helium_parse":
      return "We hit a temporary error syncing your account on our end. Please try submitting once more — if it fails again, reply to this email and we'll finish it manually.";
    case "zod_validation":
      // Field-specific templates first, then generic.
      if (f.field === "accountType") {
        return "Please pick an account type on the first step (Professional, Salon, or Student).";
      }
      if (f.field === "termsAccepted") {
        return "Please tick the wholesale terms acknowledgment on the final review step.";
      }
      if (f.field === "licenseProofFiles" || f.field === "studentIdFiles") {
        return `Your ${field} didn't upload successfully. Re-upload a clear photo or PDF (under 10MB) and resubmit.`;
      }
      return `Your ${field} is missing or invalid — go back to that step and complete it.`;
    default:
      return `There was an issue with your ${field}. Please go back to that step and update it.`;
  }
}
