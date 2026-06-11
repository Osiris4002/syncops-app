/**
 * Utilities for parsing and retrying network-related failures.
 */

export interface NetworkError {
  code: string;
  message: string;
  isRetryable: boolean;
  statusCode?: number;
}

export function parseNetworkError(error: any): NetworkError {
  if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
    return {
      code: "TIMEOUT",
      message: "Request timed out. Please try again.",
      isRetryable: true,
    };
  }

  if (
    error?.code === "ENOTFOUND" ||
    error?.code === "ECONNREFUSED" ||
    error?.message?.includes("Network")
  ) {
    return {
      code: "NO_NETWORK",
      message: "No internet connection. Please check your network.",
      isRetryable: true,
    };
  }

  if (error?.status >= 500) {
    return {
      code: "SERVER_ERROR",
      message: "Server error. Please try again later.",
      isRetryable: true,
      statusCode: error.status,
    };
  }

  if (error?.status >= 400 && error?.status < 500) {
    if (error?.status === 401 || error?.status === 403) {
      return {
        code: "UNAUTHORIZED",
        message: "You are not authorized to perform this action.",
        isRetryable: false,
        statusCode: error.status,
      };
    }

    if (error?.status === 404) {
      return {
        code: "NOT_FOUND",
        message: "Resource not found.",
        isRetryable: false,
        statusCode: error.status,
      };
    }

    return {
      code: "CLIENT_ERROR",
      message: error?.message || "Invalid request.",
      isRetryable: false,
      statusCode: error.status,
    };
  }

  if (error?.message?.includes("JWT")) {
    return {
      code: "AUTH_ERROR",
      message: "Authentication failed. Please log in again.",
      isRetryable: false,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: error?.message || "An unexpected error occurred.",
    isRetryable: true,
  };
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const parsedError = parseNetworkError(error);

      if (!parsedError.isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function formatErrorMessage(error: any): string {
  return parseNetworkError(error).message;
}
