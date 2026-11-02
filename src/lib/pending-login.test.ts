import { describe, expect, it } from "vitest";
import { setPendingMultipass, takePendingMultipass } from "./pending-login";

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
});
