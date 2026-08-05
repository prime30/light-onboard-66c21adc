/**
 * Honeypot field for bot detection.
 *
 * Two anti-bot signals:
 *  1. Hidden text input - naive bots auto-fill every input. Non-empty = spam.
 *  2. Form-start timestamp - bots typically POST in <1s. Real users take >3s
 *     to fill out a multi-step registration. Server enforces the threshold.
 *
 * The timestamp is captured once at module load (close enough to "page load"
 * for the form-fill timing check), and read at submit time.
 */
// NOTE: the field name must NOT look like a real address/company/website field.
// Chrome autofill and password managers ignore autocomplete="off" and were
// filling the old `company_website` input, which got legitimate applicants
// (e.g. macOS Chrome users) rejected as bots. Keep this name opaque and keep
// the password-manager opt-out attributes below.
export const HONEYPOT_FIELD_NAME = "hp_x9f2";
export const FORM_START_FIELD_NAME = "hp_x9f2_ts";

// Module-level so it's set once per page load, not per mount.
const formStartedAt: number = typeof Date !== "undefined" ? Date.now() : 0;

export function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-10000px",
        top: "auto",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      <input
        id={HONEYPOT_FIELD_NAME}
        name={HONEYPOT_FIELD_NAME}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
        aria-hidden="true"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        data-dashlane-ignore="true"
        data-form-type="other"
      />
      <input
        id={FORM_START_FIELD_NAME}
        name={FORM_START_FIELD_NAME}
        type="hidden"
        defaultValue={String(formStartedAt)}
      />
    </div>
  );
}


export function readHoneypotValue(): string {
  if (typeof document === "undefined") return "";
  const el = document.querySelector<HTMLInputElement>(
    `input[name="${HONEYPOT_FIELD_NAME}"]`
  );
  return el?.value ?? "";
}

export function readFormStartedAt(): number {
  return formStartedAt;
}
