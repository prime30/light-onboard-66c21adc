import { useCallback } from "react";
import { parseErrorResponse, handleApiResponse, ParsedErrorResponse } from "@/lib/error-parser";

/**
 * Custom hook for API client functionality with consistent error parsing and response handling
 */
export function useApiClient() {
  /**
   * Parse an error response and return a user-friendly message
   */
  const parseError = useCallback(async (response: Response): Promise<string> => {
    const errorResponse = await parseErrorResponse(response);
    return typeof errorResponse.message === "string" ? errorResponse.message : "An error occurred";
  }, []);

  /**
   * Handle API response with automatic success/error parsing
   */
  const handleResponse = useCallback(
    async <T = unknown>(response: Response, successMessage?: string) => {
      return handleApiResponse<T>(response, successMessage);
    },
    []
  );

  /**
   * Wrapper for fetch requests that automatically handles errors with actions
   */
  const apiCall = useCallback(
    async <T = unknown>(
      input: RequestInfo | URL,
      init?: RequestInit,
      successMessage?: string
    ): Promise<
      | { success: true; data: T; message?: string }
      | {
          success: false;
          error: string;
          actions: ParsedErrorResponse["actions"];
          statusCode: number;
        }
    > => {
      try {
        const response = await fetch(input, init);
        return handleApiResponse<T>(response, successMessage);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Network error occurred",
          actions: [],
          statusCode: 0,
        };
      }
    },
    []
  );

  return {
    parseError,
    handleResponse,
    apiCall,
  };
}
