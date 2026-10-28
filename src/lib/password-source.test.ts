import { describe, expect, it } from "vitest";
import { getPasswordSource, observePasswordInput } from "./password-source";

describe("Password entry evidence", () => {
  it("does not label undetectable autofill or replacement as hand typing", () => {
    expect(observePasswordInput({ source: "unknown", evidence: "unknown" }, { inputType: "insertReplacementText", isTrusted: true }).source).toBe("unknown");
  });
  it("separates trusted hand typing from paste", () => {
    expect(observePasswordInput({ source: "unknown", evidence: "unknown" }, { inputType: "insertText", isTrusted: true }).source).toBe("typed");
    expect(observePasswordInput({ source: "unknown", evidence: "unknown" }, { inputType: "insertFromPaste", isTrusted: true }).source).toBe("paste");
  });
  it("labels edited autofill as mixed", () => {
    expect(observePasswordInput({ source: "autofill", evidence: "browser_autofill" }, { inputType: "insertText", isTrusted: true }).source).toBe("mixed");
  });
  it("uses browser autofill state when available", () => {
    expect(getPasswordSource({ source: "unknown", evidence: "unknown" }, { matches: () => true } as unknown as HTMLInputElement).source).toBe("autofill");
  });
  it("does not trust programmatic input events", () => {
    expect(observePasswordInput({ source: "unknown", evidence: "unknown" }, { inputType: "insertText", isTrusted: false }).source).toBe("unknown");
  });
});