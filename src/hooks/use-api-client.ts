import { useCallback } from "react";
import { parseErrorResponse, handleApiResponse } from "@/lib/error-parser";

/**
 * Custom hook for API client functionality with consistent error parsing and response handling
 */
export function useApiClient() {
  /**
   * Parse an error response and return a user-friendly message
   */
  const parseError = useCallback(async (response: Response): Promise<string> => {
    const errorMessage = await parseErrorResponse(response);
    return typeof errorMessage === "string" ? errorMessage : "An error occurred";
  }, []);

  /**
   * Handle API response with automatic success/error parsing
   */
  const handleResponse = useCallback(
    async <T = any>(response: Response, successMessage?: string) => {
      return handleApiResponse<T>(response, successMessage);
    },
    []
  );

  /**
   * Wrapper for fetch requests that automatically handles errors
   */
  const apiCall = useCallback(
    async <T = any>(
      input: RequestInfo | URL,
      init?: RequestInit,
      successMessage?: string
    ): Promise<
      { success: true; data: T; message?: string } | { success: false; error: string }
    > => {
      try {
        const response = await fetch(input, init);
        return handleResponse<T>(response, successMessage);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Network error occurred",
        };
      }
    },
    [handleResponse]
  );

  return {
    parseError,
    handleResponse,
    apiCall,
  };
}
