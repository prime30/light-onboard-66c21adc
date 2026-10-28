export type PasswordSource = "unknown" | "typed" | "autofill" | "paste" | "mixed" | "new_password";
export type PasswordEvidence = { source: PasswordSource; evidence: "unknown" | "input_event" | "browser_autofill" | "new_password" };

export function observePasswordInput(previous: PasswordEvidence, event: Pick<InputEvent, "inputType" | "isTrusted">): PasswordEvidence {
  if (!event.isTrusted) return previous;
  const type = event.inputType;
  const source = type === "insertFromPaste" ? "paste" : type === "insertText" || type?.startsWith("delete") ? "typed" : "unknown";
  if (source === "unknown") return { source: "unknown", evidence: "unknown" };
  return { source: previous.source !== "unknown" && previous.source !== source ? "mixed" : source, evidence: "input_event" };
}

export function getPasswordSource(previous: PasswordEvidence, input: HTMLInputElement | null): PasswordEvidence {
  try {
    if (input?.matches(":autofill") || input?.matches(":-webkit-autofill")) {
      return { source: "autofill", evidence: "browser_autofill" };
    }
  } catch { /* Some browsers do not expose autofill state. */ }
  return previous;
}

export function passwordSourceLabel(source: string): string {
  return ({ typed: "Password typed by hand (observed)", autofill: "Password filled by browser (detected)", paste: "Password pasted", mixed: "Mixed entry or edited", new_password: "New password from reset", unknown: "Password source unknown" } as Record<string, string>)[source] ?? "Password source unknown";
}