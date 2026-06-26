// Shared helpers for deciding whether a registrant is a "qualified candidate"
// for the founder call, plus a way to read the snapshot from persisted form
// state so non-form components (e.g. CloseButton, which renders outside the
// FormProvider tree) can build the same payload that SuccessForm builds.
//
// Keep this list in sync with MonthlyOrderVolumeStep options.

export const HIGH_VOLUME_ACCOUNT_TYPES = new Set<string>([
  "professional",
  "salon",
  "licensed_stylist",
]);

export const HIGH_VOLUME_ORDER_VOLUMES = new Set<string>(["1-5", "6-10", "10+"]);

export function isHighVolumeAccount(
  accountType: string | null | undefined,
  monthlyOrderVolume: string | null | undefined
): boolean {
  if (!accountType || !monthlyOrderVolume) return false;
  return (
    HIGH_VOLUME_ACCOUNT_TYPES.has(accountType) &&
    HIGH_VOLUME_ORDER_VOLUMES.has(monthlyOrderVolume)
  );
}

export type FounderCallEligibilityInput = {
  accountType: string | null | undefined;
  monthlyOrderVolume: string | null | undefined;
  founderHighVolumeOnly: boolean;
  welcomeOfferEnabled: boolean;
};

export function computeFounderCallEligible(input: FounderCallEligibilityInput): boolean {
  if (input.welcomeOfferEnabled) return false;
  if (!input.founderHighVolumeOnly) return true;
  return isHighVolumeAccount(input.accountType, input.monthlyOrderVolume);
}

// Storage key kept in sync with FormDataContext FORM_STORAGE_KEY.
const FORM_STORAGE_KEY = "_registration_form_v2";

export type RegistrationFormSnapshot = {
  accountType: string | null;
  monthlyOrderVolume: string | null;
};

export function readRegistrationFormSnapshot(): RegistrationFormSnapshot {
  if (typeof window === "undefined") {
    return { accountType: null, monthlyOrderVolume: null };
  }
  try {
    const raw = window.localStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) return { accountType: null, monthlyOrderVolume: null };
    const parsed = JSON.parse(raw) as {
      accountType?: string | null;
      monthlyOrderVolume?: string | null;
    };
    return {
      accountType: (parsed.accountType ?? null) || null,
      monthlyOrderVolume: (parsed.monthlyOrderVolume ?? null) || null,
    };
  } catch {
    return { accountType: null, monthlyOrderVolume: null };
  }
}

export type RegistrationCloseExtras = {
  founderCallEligible: boolean;
  accountType: string | null;
  monthlyOrderVolume: string | null;
};

// Build the extras payload that should ride along on every
// CLOSE_IFRAME(reason: "registration_complete") postMessage so the parent
// theme can route qualified candidates to the founder call page.
export function buildRegistrationCloseExtras(
  flags: { founderHighVolumeOnly: boolean; welcomeOfferEnabled: boolean },
  override?: Partial<RegistrationFormSnapshot>
): RegistrationCloseExtras {
  const snapshot = readRegistrationFormSnapshot();
  const accountType = override?.accountType ?? snapshot.accountType;
  const monthlyOrderVolume = override?.monthlyOrderVolume ?? snapshot.monthlyOrderVolume;
  return {
    founderCallEligible: computeFounderCallEligible({
      accountType,
      monthlyOrderVolume,
      founderHighVolumeOnly: flags.founderHighVolumeOnly,
      welcomeOfferEnabled: flags.welcomeOfferEnabled,
    }),
    accountType,
    monthlyOrderVolume,
  };
}
