// Interface for our function response
export type FunctionResponse<T> = {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  errorMessage?: string[];
};

export const hello: string = "hi";
