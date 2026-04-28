/**
 * Honeypot field for bot detection.
 *
 * Renders a hidden text input that real users will never see or fill.
 * Naive bots auto-fill every input on the page, so any non-empty value
 * is a strong spam signal.
 *
 * Hidden via:
 *  - inline absolute positioning off-screen
 *  - tabIndex={-1} so keyboard users can't reach it
 *  - autoComplete="off" to discourage password managers
 *  - aria-hidden so screen readers skip it
 *
 * Read the value at submit time via:
 *   document.querySelector<HTMLInputElement>('input[name="company_website"]')?.value
 */
export const HONEYPOT_FIELD_NAME = "company_website";

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
