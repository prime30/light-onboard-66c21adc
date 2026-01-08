# API Error Handling Documentation

This document outlines the error handling utilities for parsing and displaying user-friendly error messages from Supabase Edge Functions and other API endpoints.

## Overview

The error handling system consists of two main components:

1. **Error Parser Utility** (`src/lib/error-parser.ts`) - Core parsing logic
2. **React Hook** (`src/hooks/useApiError.ts`) - React-friendly wrapper

These utilities automatically parse structured JSON error responses, plain text responses, and provide fallback messages based on HTTP status codes.

## Backend Response Structure

### Required Error Response Format

Your Supabase Edge Functions should return errors in this JSON structure:

```typescript
interface EdgeFunctionErrorResponse {
  success: boolean;          // Always false for errors
  statusCode: number;        // HTTP status code (400, 500, etc.)
  message?: string;          // General error message
  errorMessage?: string[];   // Array of specific error messages
}
```

### Example Backend Implementation

```typescript
function sendError(statusCode: number, errors: string[], message?: string) {
  return new Response(
    JSON.stringify({
      success: false,
      statusCode,
      message: message || "Error",
      errorMessage: errors,
    }),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Usage examples:
sendError(400, ["Email is required", "Password must be at least 8 characters"]);
sendError(500, ["Database connection failed"], "Internal Server Error");
```

### Success Response Format

For consistency, success responses should follow this pattern:

```typescript
interface SuccessResponse<T> {
  success: true;
  statusCode: number;    // Usually 200, 201, etc.
  data: T;              // Your response data
  message?: string;     // Optional success message
}
```

## Frontend Usage

### Option 1: React Hook (Recommended)

```typescript
import { useApiError } from '@/hooks/useApiError';

function CustomerForm() {
  const { apiCall } = useApiError();
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (formData: CustomerData) => {
    setError(null);
    
    const result = await apiCall('/api/create-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CREATE_CUSTOMER', data: formData })
    }, 'Customer created successfully!');
    
    if (result.success) {
      // Handle success
      console.log('Success:', result.message);
      console.log('Data:', result.data);
    } else {
      // Display parsed error message
      setError(result.error);
    }
  };
}
```

### Option 2: Direct Utility Usage

```typescript
import { parseErrorResponse, handleApiResponse } from '@/lib/error-parser';

// Manual fetch with error parsing
const response = await fetch('/api/endpoint', options);

if (!response.ok) {
  const errorMessage = await parseErrorResponse(response);
  throw new Error(typeof errorMessage === 'string' ? errorMessage : 'An error occurred');
}

// Or use the response handler
const result = await handleApiResponse(response, 'Operation successful');
if (!result.success) {
  console.error('Error:', result.error);
}
```

### Option 3: With React Query/TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { useApiError } from '@/hooks/useApiError';

function useCustomerData(customerId: string) {
  const { apiCall } = useApiError();
  
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const result = await apiCall(`/api/customers/${customerId}`);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    }
  });
}
```

## Error Message Behavior

### Structured JSON Errors

When your backend returns the proper JSON structure:

- **Single error**: Returns the error message directly
- **Multiple errors**: Returns formatted numbered list:
  ```
  1. Email is required
  2. Password must be at least 8 characters
  ```

### Fallback Handling

The parser gracefully handles various scenarios:

1. **Plain text responses** - Returns the text if meaningful
2. **Empty responses** - Uses status code-based generic message
3. **HTML error pages** - Uses status code-based generic message
4. **Network failures** - Returns "Network error occurred"

### Status Code Defaults

| Status Code | Default Message |
|-------------|-----------------|
| 400 | "The request was invalid. Please check your information and try again." |
| 401 | "You are not authorized to perform this action. Please log in and try again." |
| 403 | "Access denied. You don't have permission to perform this action." |
| 404 | "The requested resource was not found." |
| 422 | "The data provided was invalid. Please check your information and try again." |
| 429 | "Too many requests. Please wait a moment and try again." |
| 500 | "An internal server error occurred. Please try again later." |
| 502/503 | "Service temporarily unavailable. Please try again later." |

## API Reference

### `parseErrorResponse(response: Response)`

Parses an error response and returns a user-friendly message.

- **Parameters**: `response` - The fetch Response object
- **Returns**: `Promise<string | ReactNode>` - User-friendly error message
- **Usage**: For manual error parsing

### `handleApiResponse<T>(response: Response, successMessage?: string)`

Handles both success and error responses automatically.

- **Parameters**: 
  - `response` - The fetch Response object
  - `successMessage` - Optional success message
- **Returns**: Promise with `{ success: boolean; data?: T; error?: string; message?: string }`
- **Usage**: For complete response handling

### `useApiError()` Hook

React hook that provides error handling utilities.

**Returns**:
- `parseError(response)` - Parse error response
- `handleResponse(response, successMessage?)` - Handle complete response
- `apiCall(input, init?, successMessage?)` - Complete fetch wrapper

## Best Practices

### Backend Best Practices

1. **Always use consistent error structure** - Follow the `EdgeFunctionErrorResponse` interface
2. **Provide specific error messages** - Use the `errorMessage` array for validation errors
3. **Use appropriate status codes** - 400 for validation, 500 for server errors, etc.
4. **Include CORS headers** - Ensure frontend can read the error responses

### Frontend Best Practices

1. **Use the React hook for consistency** - `useApiError()` provides the cleanest API
2. **Display errors prominently** - Show parsed error messages to users immediately
3. **Handle loading states** - Show loading indicators during API calls
4. **Log detailed errors** - Console.log the full response for debugging

### Example Complete Implementation

```typescript
import { useState } from 'react';
import { useApiError } from '@/hooks/useApiError';

function RegistrationForm() {
  const { apiCall } = useApiError();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiCall('/supabase/functions/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_CUSTOMER', data: formData })
      }, 'Account created successfully!');

      if (result.success) {
        setSuccess(result.message || 'Operation completed successfully');
        // Handle successful registration
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          {success}
        </div>
      )}
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}
```

## Migration Notes

If you have existing error handling code, you can migrate gradually:

1. Update your backend to return the structured JSON format
2. Replace manual error parsing with `parseErrorResponse()`
3. Refactor fetch calls to use the `useApiError()` hook
4. Update UI components to display the parsed error messages

The utilities are designed to be backwards compatible and will gracefully handle non-structured responses during the migration period.