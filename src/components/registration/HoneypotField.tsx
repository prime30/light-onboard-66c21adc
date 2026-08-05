/**
 * Honeypot field for bot detection.
 *
 * Two anti-bot signals:
 *  1. Hidden text input - naive bots auto-fill every input. Non-empty = spam.
 *  2. Form-start timestamp - bots typically POST in <1s. Real users take >1s
 *     to fill out a multi-step registration. Server enforces the threshold.
 *
 * The timestamp is captured once at module load (close enough to "page load"
 * for the form-fill timing check), and read at submit time.
 *
 * ROOT-CAUSE NOTE (why this field is inert to browsers):
 * A plain hidden text input gets populated by Chrome autofill and by password
 * managers (1Password/LastPass/Bitwarden/Dashlane), which look for the nearest
 * text input to treat as the "username" next to a password field. That was
 * rejecting real applicants as bots. The threat we actually care about is
 * scripted HTTP clients that POST every field name they scrape from the HTML -
 * those never run browser autofill. So we keep the field present in the markup
 * but make it impossible for a browser or extension to write into it:
 *
 *  - `readOnly`: browsers and password managers refuse to autofill a readonly
 *    input. Scripted clients that set `.value` directly, or that POST the field
 *    name straight to the API, are unaffected - so detection still works.
 *  - opaque `name`/`id`: no autofill heuristic maps `hp_x9f2` to a real field.
 *  - password-manager opt-out attributes for every major extension.
 *  - `autocomplete="off"` plus `data-form-type="other"`.
 *  - rendered outside the step <form> so form-scoped fillers skip it.
 *  - at read time we additionally drop the value if the browser marked the
 *    input as autofilled (`:autofill`), so even a filler that defeats all of
 *    the above cannot get a real user blocked.
 */
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
        readOnly
        aria-hidden="true"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        data-dashlane-ignore="true"
        data-protonpass-ignore="true"
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

/**
 * True when the browser itself filled this input (Chrome/Safari `:autofill`,
 * older WebKit `:-webkit-autofill`). Those are never bots.
 */
function wasBrowserAutofilled(el: HTMLInputElement): boolean {
  for (const selector of [":autofill", ":-webkit-autofill"]) {
    try {
      if (el.matches(selector)) return true;
    } catch {
      /* selector unsupported in this engine - ignore */
    }
  }
  return false;
}

export function readHoneypotValue(): string {
  if (typeof document === "undefined") return "";
  const el = document.querySelector<HTMLInputElement>(`input[name="${HONEYPOT_FIELD_NAME}"]`);
  if (!el) return "";
  const value = el.value ?? "";
  if (!value.trim()) return "";
  // A real user's browser/extension filled it - report empty so the server's
  // spam gate never fires on them.
  if (wasBrowserAutofilled(el)) return "";
  return value;
}

export function readFormStartedAt(): number {
  return formStartedAt;
}
