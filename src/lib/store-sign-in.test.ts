import { afterEach, describe, expect, it, vi } from "vitest";
import { finishSigningIn } from "./store-sign-in";

afterEach(() => vi.unstubAllGlobals());
describe("Post-reset sign-in", () => {
  it("uses exactly the newly submitted password and preserves the store page", async () => {
    const location = { host: "dropdeadextensions.com", pathname: "/products/hair", search: "?variant=123", href: "" };
    vi.stubGlobal("window", { top: { location }, location });
    const request = vi.fn().mockResolvedValue({ json: async () => ({ success: true, data: { multipassUrl: "https://dropdeadextensions.com/account/login/multipass/synthetic" } }) });
    vi.stubGlobal("fetch", request);
    await finishSigningIn("customer@example.com", "Just set password 123", { context: "password_reset", passwordSource: "new_password" });
    const sent = JSON.parse(request.mock.calls[0][1].body);
    expect(sent.password).toBe("Just set password 123");
    expect(sent.context).toBe("password_reset");
    expect(sent.return_to).toBe("/products/hair?variant=123");
    expect(location.href).toBe("https://dropdeadextensions.com/account/login/multipass/synthetic");
  });
  it("falls back to a top-level store form with the same password when Multipass is unavailable", async () => {
    vi.stubGlobal("window", { top: { location: { host: "dropdeadextensions.com", pathname: "/cart", search: "" } } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: false }) }));
    const fields: Array<{ name: string; value: string }> = [];
    const form = { appendChild: (input: { name: string; value: string }) => fields.push(input), submit: vi.fn(), target: "", action: "" };
    vi.stubGlobal("document", { createElement: (tag: string) => tag === "form" ? form : {}, body: { appendChild: vi.fn() }, referrer: "" });
    await finishSigningIn("customer@example.com", "New password 123");
    expect(fields.find((field) => field.name === "customer[password]")?.value).toBe("New password 123");
    expect(form.target).toBe("_top");
    expect(form.submit).toHaveBeenCalledOnce();
  });
});