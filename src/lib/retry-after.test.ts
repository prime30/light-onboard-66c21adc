import { describe, expect, it } from "vitest";
import { signInPausedMessage } from "./retry-after";

describe("signInPausedMessage", () => {
  const now = new Date(2026, 10, 2, 13, 12, 25);

  it("gives the wait in minutes and the unlock time, rounded up", () => {
    const msg = signInPausedMessage(30 * 60 + 11, now);
    expect(msg).toContain("Try again in 31 minutes");
    const clock = new Date(2026, 10, 2, 13, 43).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    expect(msg).toContain(clock.replace(/\s/g, "\u00A0"));
  });

  it("never says 0 minutes", () => {
    expect(signInPausedMessage(5, now)).toContain("Try again in 1 minute (");
  });
});
