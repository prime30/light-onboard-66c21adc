import { ReactNode } from "react";

/**
 * Interface matching the error response format from the Supabase edge functions
 */
interface EdgeFunctionErrorResponse {
  success: boolean;
  statusCode: number;
  message?: string;
  errorMessage?: string[];
}

/**
 * Parse error responses from edge functions and return user-friendly messages
 * @param response - The Response object from fetch
 * @returns Promise<string | ReactNode> - A user-friendly error message
 */
export async function parseErrorResponse(response: Response): Promise<string | ReactNode> {
  try {
    // Try to parse as JSON first
    const text = await response.text();

    if (!text) {
      return getGenericErrorMessage(response.status);
    }

    try {
      const errorData: EdgeFunctionErrorResponse = JSON.parse(text);

      // If it's a structured error response from our edge function
      if (errorData && typeof errorData === 'object') {
        return formatStructuredError(errorData, response.status);
      }
    } catch {
      // If JSON parsing fails, treat as plain text
      return formatPlainTextError(text, response.status);
    }

    // Fallback to generic message
    return getGenericErrorMessage(response.status);
  } catch {
    // If all else fails, return a generic error
    return getGenericErrorMessage(response.status);
  }
}

/**
 * Format a structured error response from the edge function
 */
function formatStructuredError(errorData: EdgeFunctionErrorResponse, statusCode: number): string {
  // If we have specific error messages, format them nicely
  if (errorData.errorMessage && Array.isArray(errorData.errorMessage) && errorData.errorMessage.length > 0) {
    // Filter out any empty or invalid messages
    const validMessages = errorData.errorMessage.filter(msg => msg && typeof msg === 'string');

    if (validMessages.length === 1) {
      return validMessages[0];
    } else if (validMessages.length > 1) {
      // For multiple errors, create a formatted list
      return validMessages.map((msg, index) => `${index + 1}. ${msg}`).join('\n');
    }
  }

  // Fall back to the general message if available
  if (errorData.message) {
    return errorData.message;
  }

  // Last resort: use status code
  return getGenericErrorMessage(statusCode);
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
  if (cleanText.includes('error') || cleanText.includes('Error')) {
    return cleanText;
  }

  // For short, meaningful text responses
  if (cleanText.length < 200 && !cleanText.includes('<html')) {
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
 * @returns Promise with parsed result
 */
export async function handleApiResponse<T = any>(
  response: Response,
  successMessage?: string
): Promise<{ success: true; data: T; message?: string } | { success: false; error: string }> {
  if (response.ok) {
    try {
      const data = await response.json();
      return {
        success: true,
        data,
        message: successMessage
      };
    } catch {
      return {
        success: true,
        data: null as T,
        message: successMessage || "Operation completed successfully"
      };
    }
  } else {
    const errorMessage = await parseErrorResponse(response);
    return {
      success: false,
      error: typeof errorMessage === 'string' ? errorMessage : 'An error occurred'
    };
  }
}

/**
 * Type guard to check if an error response is from our edge function
 */
export function isEdgeFunctionError(obj: any): obj is EdgeFunctionErrorResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    'success' in obj &&
    'statusCode' in obj &&
    obj.success === false
  );
}
