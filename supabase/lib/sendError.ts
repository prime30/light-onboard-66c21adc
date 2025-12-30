import { corsHeaders } from "./corsHeaders.ts";
import { type FunctionResponse } from "./types.ts";

export function sendError<T = object>(
  statusCode: number,
  errorMessage: string[],
  message: string = "An error occurred"
) {
  const response: FunctionResponse<T> = {
    success: false,
    message,
    statusCode,
    errorMessage,
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
