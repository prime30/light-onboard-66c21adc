import { corsHeaders } from "./corsHeaders.ts";
import { sendError } from "./sendError.ts";

export type Method = "GET" | "POST" | "OPTIONS" | "PUT" | "DELETE";

export function validateRequestMethod(
  req: Request,
  allowedMethods: Method[] = ["GET"]
): Response | null {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (!allowedMethods.includes(req.method as Method)) {
    return sendError(405, [
      `Method not allowed. Only ${allowedMethods.join(", ")} requests are accepted.`,
    ]);
  }

  return null;
}
