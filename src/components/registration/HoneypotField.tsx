/**
 * Honeypot field for bot detection.
 *
 * Two anti-bot signals:
 *  1. Hidden text input — naive bots auto-fill every input. Non-empty = spam.
 *  2. Form-start timestamp — bots typically POST in <1s. Real users take >3s
 *     to fill out a multi-step registration. Server enforces the threshold.
 *
 * The timestamp is captured once at module load (close enough to "page load"
 * for the form-fill timing check), and read at submit time.
 */
export const HONEYPOT_FIELD_NAME = "company_website";
export const FORM_START_FIELD_NAME = "company_website_start";

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
      <label htmlFor={HONEYPOT_FIELD_NAME}>
        Leave this field empty
        <input
          id={HONEYPOT_FIELD_NAME}
          name={HONEYPOT_FIELD_NAME}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
        <input
          id={FORM_START_FIELD_NAME}
          name={FORM_START_FIELD_NAME}
          type="hidden"
          defaultValue={String(formStartedAt)}
        />
      </label>
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
