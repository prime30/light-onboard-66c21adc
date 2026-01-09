import { ReactNode } from "react";

/**
 * Interface for error actions from backend
 */
interface ErrorAction {
  type: string;
  label: string;
  url?: string;
}

/**
 * Interface matching the error response format from the Supabase edge functions
 */
interface EdgeFunctionErrorResponse {
  success: boolean;
  statusCode: number;
  message?: string;
  errorMessage?: string[];
  actions?: ErrorAction[];
}

/**
 * Enhanced error response with actions from backend
 */
export interface ParsedErrorResponse {
  message: string | ReactNode;
  actions: ErrorAction[];
  statusCode: number;
}

/**
 * Parse error responses from edge functions and return user-friendly messages with action types
 * @param response - The Response object from fetch
 * @returns Promise<ParsedErrorResponse> - Enhanced error response with action type
 */
export async function parseErrorResponse(response: Response): Promise<ParsedErrorResponse> {
  try {
    // Try to parse as JSON first
    const text = await response.text();

    if (!text) {
      return {
        message: getGenericErrorMessage(response.status),
        actions: [],
        statusCode: response.status,
      };
    }

    try {
      const errorData: EdgeFunctionErrorResponse = JSON.parse(text);

      // If it's a structured error response from our edge function
      if (errorData && typeof errorData === "object") {
        return formatStructuredError(errorData, response.status);
      }
    } catch {
      // If JSON parsing fails, treat as plain text
      return {
        message: formatPlainTextError(text, response.status),
        actions: [],
        statusCode: response.status,
      };
    }

    // Fallback to generic message
    return {
      message: getGenericErrorMessage(response.status),
      actions: [],
      statusCode: response.status,
    };
  } catch {
    // If all else fails, return a generic error
    return {
      message: getGenericErrorMessage(response.status),
      actions: [],
      statusCode: response.status,
    };
  }
}

/**
 * Format a structured error response from the edge function with action detection
 */
function formatStructuredError(
  errorData: EdgeFunctionErrorResponse,
  statusCode: number
): ParsedErrorResponse {
  let message: string;

  // If we have specific error messages, format them nicely
  if (
    errorData.errorMessage &&
    Array.isArray(errorData.errorMessage) &&
    errorData.errorMessage.length > 0
  ) {
    // Filter out any empty or invalid messages
    const validMessages = errorData.errorMessage.filter((msg) => msg && typeof msg === "string");

    if (validMessages.length === 1) {
      message = validMessages[0];
    } else if (validMessages.length > 1) {
      // For multiple errors, create a formatted list
      message = validMessages.map((msg, index) => `${index + 1}. ${msg}`).join("\n");
    } else {
      message = errorData.message || getGenericErrorMessage(statusCode);
    }
  } else {
    // Fall back to the general message if available
    message = errorData.message || getGenericErrorMessage(statusCode);
  }

  return {
    message,
    actions: errorData.actions || [],
    statusCode,
  };
}

/**
 * Format plain text error responses
 */
function formatPlainTextError(text: string, statusCode: number): string {
  // Clean up the text
  const cleanText = text.trim();

  if (cleanText.length === 0) {
    return getGenericErrorMessage(statusCode);
  }

  // If it's a very long response (likely HTML error page), truncate it
  if (cleanText.length > 500) {
    return getGenericErrorMessage(statusCode);
  }

  // Try to extract meaningful error from common error formats
  if (cleanText.includes("error") || cleanText.includes("Error")) {
    return cleanText;
  }

  // For short, meaningful text responses
  if (cleanText.length < 200 && !cleanText.includes("<html")) {
    return cleanText;
  }

  return getGenericErrorMessage(statusCode);
}

/**
 * Get a user-friendly generic error message based on status code
 */
function getGenericErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "The request was invalid. Please check your information and try again.";
    case 401:
      return "You are not authorized to perform this action. Please log in and try again.";
    case 403:
      return "Access denied. You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 405:
      return "This action is not allowed.";
    case 408:
      return "The request timed out. Please try again.";
    case 409:
      return "There was a conflict with your request. Please check your data and try again.";
    case 422:
      return "The data provided was invalid. Please check your information and try again.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
      return "An internal server error occurred. Please try again later.";
    case 502:
      return "Service temporarily unavailable. Please try again later.";
    case 503:
      return "Service unavailable. Please try again later.";
    case 504:
      return "The request timed out. Please try again later.";
    default:
      if (statusCode >= 400 && statusCode < 500) {
        return "There was a problem with your request. Please check your information and try again.";
      } else if (statusCode >= 500) {
        return "A server error occurred. Please try again later.";
      } else {
        return "An unexpected error occurred. Please try again.";
      }
  }
}

/**
 * Convenience function for handling fetch responses with error parsing
 * @param response - The Response object from fetch
 * @param successMessage - Optional success message for successful responses
 * @returns Promise with parsed result including action type
 */
export async function handleApiResponse<T = unknown>(
  response: Response,
  successMessage?: string
): Promise<
  | { success: true; data: T; message?: string }
  | {
      success: false;
      error: string;
      actions: ErrorAction[];
      statusCode: number;
    }
> {
  if (response.ok) {
    try {
      const data = await response.json();
      return {
        success: true,
        data,
        message: successMessage,
      };
    } catch {
      return {
        success: true,
        data: null as T,
        message: successMessage || "Operation completed successfully",
      };
    }
  } else {
    const errorResponse = await parseErrorResponse(response);
    return {
      success: false,
      error:
        typeof errorResponse.message === "string" ? errorResponse.message : "An error occurred",
      actions: errorResponse.actions,
      statusCode: errorResponse.statusCode,
    };
  }
}

/**
 * Type guard to check if an error response is from our edge function
 */
export function isEdgeFunctionError(obj: unknown): obj is EdgeFunctionErrorResponse {
  return (
    obj &&
    typeof obj === "object" &&
    "success" in obj &&
    "statusCode" in obj &&
    obj.success === false
  );
}
