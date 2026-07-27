// Australian hairdressing qualifications for the AU registration branch.
export const QUALIFICATION_OPTIONS = [
  { value: "cert3", label: "Certificate III in Hairdressing (SHB30416)" },
  { value: "cert4", label: "Certificate IV in Hairdressing" },
  { value: "apprentice", label: "Apprentice / in training" },
] as const;

export type Qualification = (typeof QUALIFICATION_OPTIONS)[number]["value"];

export const QUALIFICATION_TAG: Record<Qualification, string> = {
  cert3: "qualification-cert3",
  cert4: "qualification-cert4",
  apprentice: "qualification-apprentice",
};

export const QUALIFICATION_LABEL: Record<Qualification, string> = Object.fromEntries(
  QUALIFICATION_OPTIONS.map((o) => [o.value, o.label])
) as Record<Qualification, string>;
