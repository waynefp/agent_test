/**
 * Retry Utility
 *
 * Provides exponential backoff retry logic for API calls.
 * Essential for production reliability when dealing with:
 * - Rate limits (429 errors)
 * - Temporary outages
 * - Network issues
 * - Overloaded servers (529 errors)
 *
 * BEGINNER NOTE: In production, API calls can fail for many reasons.
 * Instead of immediately failing, we retry with increasing delays
 * (exponential backoff) to give the service time to recover.
 *
 * Phase 11: Production Readiness
 */

import { logger } from './logger.js';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;

  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs: number;

  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs: number;

  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier: number;

  /** Add random jitter to prevent thundering herd (default: true) */
  jitter: boolean;

  /** HTTP status codes that should trigger a retry (default: [429, 500, 502, 503, 504, 529]) */
  retryableStatusCodes: number[];

  /** Whether to retry on network errors (default: true) */
  retryOnNetworkError: boolean;

  /** Optional callback when a retry is attempted */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableStatusCodes: [429, 500, 502, 503, 504, 529],
  retryOnNetworkError: true,
};

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
}

/**
 * Error class for API errors with status codes
 * BEGINNER NOTE: This helps us identify specific API errors for retry logic
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryAfterMs?: number,
    public isOverloaded?: boolean
  ) {
    super(message);
    this.name = 'APIError';
  }

  /**
   * Check if this error is retryable based on config
   */
  isRetryable(config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
    return config.retryableStatusCodes.includes(this.statusCode);
  }
}

/**
 * Calculate delay for the next retry attempt
 * BEGINNER NOTE: Uses exponential backoff with optional jitter
 *
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @param retryAfterMs - Optional delay specified by the server
 * @returns Delay in milliseconds
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  retryAfterMs?: number
): number {
  // If server specified a retry-after delay, use it (but respect max)
  if (retryAfterMs !== undefined) {
    return Math.min(retryAfterMs, config.maxDelayMs);
  }

  // Calculate exponential backoff
  // Formula: initialDelay * (multiplier ^ (attempt - 1))
  let delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);

  // Apply max delay cap
  delay = Math.min(delay, config.maxDelayMs);

  // Add jitter to prevent thundering herd
  // BEGINNER NOTE: If many clients retry at the exact same time, it creates
  // a "thundering herd" that overwhelms the server. Random jitter spreads out retries.
  if (config.jitter) {
    // Add random jitter of +/- 20%
    const jitterFactor = 0.2;
    const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
    delay = Math.max(0, delay + jitter);
  }

  return Math.round(delay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is a network error
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const networkErrorMessages = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'fetch failed',
      'network error',
      'socket hang up',
    ];
    return networkErrorMessages.some(msg =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }
  return false;
}

/**
 * Check if an error should be retried
 */
function shouldRetry(
  error: unknown,
  config: RetryConfig
): boolean {
  // Check for API errors with status codes
  if (error instanceof APIError) {
    return error.isRetryable(config);
  }

  // Check for network errors
  if (config.retryOnNetworkError && isNetworkError(error)) {
    return true;
  }

  // Check for Anthropic SDK error structure
  if (error && typeof error === 'object') {
    const apiError = error as any;

    // Anthropic SDK errors have a status property
    if (apiError.status && typeof apiError.status === 'number') {
      return config.retryableStatusCodes.includes(apiError.status);
    }

    // Check for error type (Anthropic uses 'overloaded_error' for 529)
    if (apiError.error?.type === 'overloaded_error') {
      return true;
    }
  }

  return false;
}

/**
 * Extract retry-after delay from an error if present
 */
function extractRetryAfter(error: unknown): number | undefined {
  if (error instanceof APIError) {
    return error.retryAfterMs;
  }

  // Check for Anthropic SDK error structure
  if (error && typeof error === 'object') {
    const apiError = error as any;

    // Check headers for retry-after
    if (apiError.headers?.['retry-after']) {
      const retryAfter = apiError.headers['retry-after'];
      // Could be seconds (number) or a date
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
  }

  return undefined;
}

/**
 * Execute a function with retry logic
 * BEGINNER NOTE: This wraps any async function and automatically retries
 * on failure using exponential backoff.
 *
 * @param fn - The async function to execute
 * @param config - Optional retry configuration
 * @returns Result of the operation
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => client.messages.create(params),
 *   { maxRetries: 3 }
 * );
 *
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error('Failed after', result.attempts, 'attempts');
 * }
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= fullConfig.maxRetries + 1; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const canRetry = attempt <= fullConfig.maxRetries && shouldRetry(error, fullConfig);

      if (!canRetry) {
        // No more retries or error is not retryable
        logger.error(`Operation failed (not retryable): ${lastError.message}`);
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalTimeMs: Date.now() - startTime,
        };
      }

      // Calculate delay for next attempt
      const retryAfterMs = extractRetryAfter(error);
      const delayMs = calculateDelay(attempt, fullConfig, retryAfterMs);

      // Log retry attempt
      logger.warn(
        `Attempt ${attempt}/${fullConfig.maxRetries + 1} failed: ${lastError.message}. ` +
        `Retrying in ${delayMs}ms...`
      );

      // Call onRetry callback if provided
      fullConfig.onRetry?.(attempt, lastError, delayMs);

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts: fullConfig.maxRetries + 1,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Execute a function with retry logic, throwing on failure
 * BEGINNER NOTE: Same as withRetry but throws the error instead of returning it.
 * Use this when you want simple error propagation.
 *
 * @param fn - The async function to execute
 * @param config - Optional retry configuration
 * @returns The result data
 * @throws The last error if all retries fail
 */
export async function retryOrThrow<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const result = await withRetry(fn, config);

  if (result.success && result.data !== undefined) {
    return result.data;
  }

  throw result.error || new Error('Operation failed after all retries');
}

/**
 * Create a retry wrapper for a function
 * BEGINNER NOTE: Creates a reusable wrapper that you can call multiple times
 *
 * @param fn - The async function to wrap
 * @param config - Optional retry configuration
 * @returns A wrapped function with retry logic
 *
 * @example
 * ```typescript
 * const sendMessage = createRetryWrapper(
 *   (msg: string) => client.messages.create({ ... }),
 *   { maxRetries: 3 }
 * );
 *
 * // Now use it anywhere
 * const response = await sendMessage('Hello');
 * ```
 */
export function createRetryWrapper<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: Partial<RetryConfig> = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return retryOrThrow(() => fn(...args), config);
  };
}

/**
 * Helper to create an API error from an Anthropic error response
 */
export function createAPIErrorFromResponse(error: unknown): APIError | Error {
  if (error && typeof error === 'object') {
    const apiError = error as any;

    // Anthropic SDK error format
    if (apiError.status && typeof apiError.status === 'number') {
      const isOverloaded = apiError.error?.type === 'overloaded_error';
      return new APIError(
        apiError.message || 'API error',
        apiError.status,
        extractRetryAfter(error),
        isOverloaded
      );
    }
  }

  return error instanceof Error ? error : new Error(String(error));
}
