import { IsOk } from "./types.ts";

export async function parseRequestBody<T>(req: Request): Promise<IsOk<T>> {
  // Parse the request body
  try {
    const requestBody = await req.json();
    return {
      success: true,
      data: requestBody,
    };
  } catch (parseError) {
    console.error("Failed to parse request body:", parseError);
    return {
      success: false,
      errors: ["Invalid JSON in request body"],
      statusCode: 400,
    };
  }
}
