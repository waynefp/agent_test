/**
 * Error Utilities
 *
 * Custom error classes for better error handling.
 *
 * BEGINNER NOTE: Creating custom errors makes it easier to handle different
 * types of problems in different ways. You can catch specific error types!
 */

/**
 * Base error class for all application errors
 * BEGINNER NOTE: All our custom errors extend this base class
 */
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ApplicationError';

    // Maintains proper stack trace (for V8 engines like Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends ApplicationError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIGURATION_ERROR', cause);
    this.name = 'ConfigurationError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends ApplicationError {
  constructor(
    message: string,
    public details?: unknown,
    cause?: Error
  ) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when an API call fails
 */
export class ApiError extends ApplicationError {
  constructor(
    message: string,
    public statusCode?: number,
    cause?: Error
  ) {
    super(message, 'API_ERROR', cause);
    this.name = 'ApiError';
  }
}

/**
 * Error thrown when a file operation fails
 */
export class FileSystemError extends ApplicationError {
  constructor(
    message: string,
    public path?: string,
    cause?: Error
  ) {
    super(message, 'FILESYSTEM_ERROR', cause);
    this.name = 'FileSystemError';
  }
}

/**
 * Helper function to check if an error is of a specific type
 * BEGINNER NOTE: Use this in catch blocks to handle different errors differently
 *
 * @example
 * try {
 *   // ... code that might throw
 * } catch (error) {
 *   if (isErrorOfType(error, ValidationError)) {
 *     // Handle validation error
 *   }
 * }
 */
export function isErrorOfType<T extends Error>(
  error: unknown,
  errorType: new (...args: any[]) => T
): error is T {
  return error instanceof errorType;
}

/**
 * Get a user-friendly error message from any error
 * BEGINNER NOTE: Safely extracts an error message from unknown errors
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Get the full error stack or a fallback message
 */
export function getErrorStack(error: unknown): string {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  return getErrorMessage(error);
}
