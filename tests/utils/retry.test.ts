/**
 * Retry Utility Tests
 *
 * Tests for the retry utility to verify correct behavior.
 *
 * BEGINNER NOTE: Testing retry logic requires simulating failures.
 * We use a counter to track attempts and can make functions fail
 * on specific attempts to test retry behavior.
 *
 * Phase 11: Production Readiness
 */

import {
  withRetry,
  retryOrThrow,
  calculateDelay,
  APIError,
  DEFAULT_RETRY_CONFIG,
} from '../../src/utils/retry.js';

/**
 * Simple test result tracker
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Helper to run a test
 */
async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg });
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${errorMsg}`);
  }
}

/**
 * Simple assertion helpers
 */
function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value: boolean, message?: string): void {
  if (!value) {
    throw new Error(message || `Expected true, got false`);
  }
}

function assertFalse(value: boolean, message?: string): void {
  if (value) {
    throw new Error(message || `Expected false, got true`);
  }
}

/**
 * Helper to create a function that fails N times then succeeds
 */
function createFailingFunction<T>(
  failCount: number,
  successValue: T,
  errorCode: number = 500
): () => Promise<T> {
  let attempts = 0;
  return async () => {
    attempts++;
    if (attempts <= failCount) {
      throw new APIError(`Simulated failure (attempt ${attempts})`, errorCode);
    }
    return successValue;
  };
}

/**
 * Helper to create a function that always fails
 */
function createAlwaysFailingFunction(errorCode: number = 500): () => Promise<never> {
  return async () => {
    throw new APIError('Simulated permanent failure', errorCode);
  };
}

/**
 * Run all retry tests
 */
async function runTests(): Promise<void> {
  console.log('\n🧪 Retry Utility Tests\n');

  // Test: Immediate success
  await test('Returns immediately on success', async () => {
    let callCount = 0;
    const result = await withRetry(async () => {
      callCount++;
      return 'success';
    });

    assertTrue(result.success);
    assertEqual(result.data, 'success');
    assertEqual(result.attempts, 1);
    assertEqual(callCount, 1);
  });

  // Test: Retries on failure
  await test('Retries on retryable failure', async () => {
    const fn = createFailingFunction(2, 'success');
    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });

    assertTrue(result.success);
    assertEqual(result.data, 'success');
    assertEqual(result.attempts, 3);
  });

  // Test: Fails after max retries
  await test('Fails after max retries exhausted', async () => {
    const fn = createAlwaysFailingFunction();
    const result = await withRetry(fn, { maxRetries: 2, initialDelayMs: 10 });

    assertFalse(result.success);
    assertEqual(result.attempts, 3); // Initial + 2 retries
    assertTrue(result.error instanceof Error);
  });

  // Test: Does not retry non-retryable errors
  await test('Does not retry non-retryable errors', async () => {
    const fn = createAlwaysFailingFunction(400); // 400 is not retryable
    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });

    assertFalse(result.success);
    assertEqual(result.attempts, 1); // Should not retry
  });

  // Test: Retries on rate limit (429)
  await test('Retries on rate limit (429)', async () => {
    const fn = createFailingFunction(1, 'success', 429);
    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });

    assertTrue(result.success);
    assertEqual(result.attempts, 2);
  });

  // Test: Retries on overloaded (529)
  await test('Retries on overloaded (529)', async () => {
    const fn = createFailingFunction(1, 'success', 529);
    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });

    assertTrue(result.success);
    assertEqual(result.attempts, 2);
  });

  // Test: onRetry callback is called
  await test('Calls onRetry callback on each retry', async () => {
    const retryAttempts: number[] = [];
    const fn = createFailingFunction(2, 'success');

    await withRetry(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
      onRetry: (attempt) => {
        retryAttempts.push(attempt);
      },
    });

    assertEqual(retryAttempts.length, 2);
    assertEqual(retryAttempts[0], 1);
    assertEqual(retryAttempts[1], 2);
  });

  // Test: retryOrThrow returns data on success
  await test('retryOrThrow returns data on success', async () => {
    const result = await retryOrThrow(async () => 'success');
    assertEqual(result, 'success');
  });

  // Test: retryOrThrow throws on failure
  await test('retryOrThrow throws on failure', async () => {
    const fn = createAlwaysFailingFunction();
    let threw = false;

    try {
      await retryOrThrow(fn, { maxRetries: 1, initialDelayMs: 10 });
    } catch {
      threw = true;
    }

    assertTrue(threw, 'Expected retryOrThrow to throw');
  });

  // Test: calculateDelay uses exponential backoff
  await test('calculateDelay uses exponential backoff', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitter: false };

    // Attempt 1: 1000ms (initial)
    const delay1 = calculateDelay(1, config);
    assertEqual(delay1, 1000);

    // Attempt 2: 2000ms (1000 * 2^1)
    const delay2 = calculateDelay(2, config);
    assertEqual(delay2, 2000);

    // Attempt 3: 4000ms (1000 * 2^2)
    const delay3 = calculateDelay(3, config);
    assertEqual(delay3, 4000);
  });

  // Test: calculateDelay respects maxDelay
  await test('calculateDelay respects maxDelay', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitter: false, maxDelayMs: 5000 };

    // Attempt 4 would be 8000ms, but capped at 5000
    const delay = calculateDelay(4, config);
    assertEqual(delay, 5000);
  });

  // Test: calculateDelay respects retryAfter
  await test('calculateDelay respects retry-after from server', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitter: false };

    // Server says wait 15 seconds
    const delay = calculateDelay(1, config, 15000);
    assertEqual(delay, 15000);
  });

  // Test: APIError is retryable for correct status codes
  await test('APIError.isRetryable works correctly', () => {
    const error429 = new APIError('Rate limited', 429);
    assertTrue(error429.isRetryable());

    const error500 = new APIError('Server error', 500);
    assertTrue(error500.isRetryable());

    const error400 = new APIError('Bad request', 400);
    assertFalse(error400.isRetryable());

    const error401 = new APIError('Unauthorized', 401);
    assertFalse(error401.isRetryable());
  });

  // Test: Total time is tracked
  await test('Tracks total time correctly', async () => {
    const fn = createFailingFunction(1, 'success');
    const startTime = Date.now();

    const result = await withRetry(fn, { maxRetries: 2, initialDelayMs: 50 });

    const elapsed = Date.now() - startTime;
    assertTrue(result.success);
    assertTrue(result.totalTimeMs >= 50, `Total time should be at least 50ms, got ${result.totalTimeMs}`);
    assertTrue(result.totalTimeMs <= elapsed + 100, 'Total time should be reasonable');
  });

  // Print summary
  console.log('\n' + '─'.repeat(40));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
