import { describe, expect, it } from "vitest";
import { handleApiResponse, parseErrorResponse } from "./error-parser";

describe("parseErrorResponse", () => {
  it("parses structured edge-function errors", async () => {
    const response = new Response(
      JSON.stringify({
        success: false,
        statusCode: 400,
        message: "Validation failed",
        errorMessage: ["Email is required"],
        actions: [{ type: "RETRY", label: "Try again" }],
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );

    const parsed = await parseErrorResponse(response);
    expect(parsed.statusCode).toBe(400);
    expect(parsed.message).toBe("Email is required");
    expect(parsed.actions).toHaveLength(1);
  });

  it("falls back to generic messages for empty bodies", async () => {
    const response = new Response("", { status: 503 });
    const parsed = await parseErrorResponse(response);

    expect(parsed.statusCode).toBe(503);
    expect(parsed.message).toBe("Service unavailable. Please try again later.");
    expect(parsed.actions).toEqual([]);
  });
});

describe("handleApiResponse", () => {
  it("returns success payload for OK responses", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const result = await handleApiResponse<{ ok: boolean }>(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ok).toBe(true);
    }
  });
});
