// Interface for our function response
export type FunctionResponse<T> = {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  errorMessage?: string[];
};

export type IsOk<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: string[];
      statusCode?: number;
    };

export const hello: string = "hi";
