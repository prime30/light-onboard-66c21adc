import { describe, expect, it } from "vitest";
import { findPostResetRefusals } from "./post-reset-refusals";

const ev = (outcome: string, at: string, source = "customer-login", code: string | null = null) => ({ email: "a@b.com", source, outcome, code, created_at: at });

describe("findPostResetRefusals", () => {
  it("flags a refused sign-in within 15 minutes of a reset", () => {
    const r = findPostResetRefusals([ev("reset_succeeded", "2026-10-28T19:00:00Z"), ev("invalid_credentials", "2026-10-28T19:00:03Z")]);
    expect(r).toHaveLength(1);
    expect(r[0].refusals).toBe(1);
  });
  it("ignores a refusal more than 15 minutes after the reset", () => {
    expect(findPostResetRefusals([ev("reset_succeeded", "2026-10-28T19:00:00Z"), ev("invalid_credentials", "2026-10-28T19:16:00Z")])).toHaveLength(0);
  });
  it("ignores refusals with no prior reset", () => {
    expect(findPostResetRefusals([ev("invalid_credentials", "2026-10-28T19:00:00Z")])).toHaveLength(0);
  });
  it("counts browser-reported rejections", () => {
    const r = findPostResetRefusals([ev("reset_succeeded", "2026-10-28T19:00:00Z"), ev("error", "2026-10-28T19:01:00Z", "browser_report", "rejected"), ev("invalid_credentials", "2026-10-28T19:02:00Z")]);
    expect(r[0].refusals).toBe(2);
  });
  it("drops customers who signed in fine after the refusal", () => {
    expect(findPostResetRefusals([ev("reset_succeeded", "2026-10-28T19:00:00Z"), ev("invalid_credentials", "2026-10-28T19:00:03Z"), ev("multipass_issued", "2026-10-28T19:05:00Z", "multipass-login")])).toHaveLength(0);
  });
  it("keeps customers whose only success came before the refusal", () => {
    expect(findPostResetRefusals([ev("reset_succeeded", "2026-10-28T19:00:00Z"), ev("password_verified", "2026-10-28T19:00:01Z"), ev("invalid_credentials", "2026-10-28T19:02:00Z")])).toHaveLength(1);
  });
});
