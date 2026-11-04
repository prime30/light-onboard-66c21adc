import { describe, expect, it } from "vitest";
import {
  clearStandbyMultipass,
  hasPendingMultipass,
  promoteStandbyMultipass,
  setPendingMultipass,
  setStandbyMultipass,
  takePendingMultipass,
} from "./pending-login";

describe("pending Multipass link", () => {
  it("hands the link out once while it is fresh", () => {
    setPendingMultipass("https://dropdeadextensions.com/account/login/multipass/t");
    expect(takePendingMultipass()).toBe("https://dropdeadextensions.com/account/login/multipass/t");
    expect(takePendingMultipass()).toBeNull();
  });

  it("drops a link older than ten minutes", () => {
    setPendingMultipass("https://dropdeadextensions.com/account/login/multipass/t");
    expect(takePendingMultipass(Date.now() + 10 * 60 * 1000 + 1)).toBeNull();
  });

  it("reports a fresh link without handing it out", () => {
    setPendingMultipass("https://dropdeadextensions.com/account/login/multipass/t");
    expect(hasPendingMultipass()).toBe(true);
    expect(hasPendingMultipass(Date.now() + 10 * 60 * 1000 + 1)).toBe(false);
    expect(takePendingMultipass()).toBe("https://dropdeadextensions.com/account/login/multipass/t");
    expect(hasPendingMultipass()).toBe(false);
  });
});

describe("standby Multipass link", () => {
  const url = "https://dropdeadextensions.com/account/login/multipass/s";

  it("is not handed out until promoted", () => {
    setStandbyMultipass(url);
    expect(takePendingMultipass()).toBeNull();
    expect(promoteStandbyMultipass()).toBe(false);
  });

  it("is handed out on close once promoted, without triggering the immediate open", () => {
    setStandbyMultipass(url);
    expect(promoteStandbyMultipass()).toBe(true);
    expect(hasPendingMultipass()).toBe(false);
    expect(takePendingMultipass()).toBe(url);
    expect(takePendingMultipass()).toBeNull();
  });

  it("is dropped when the theme's sign-in works", () => {
    setStandbyMultipass(url);
    clearStandbyMultipass();
    expect(promoteStandbyMultipass()).toBe(false);
    expect(takePendingMultipass()).toBeNull();
  });
});
