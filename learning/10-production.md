# Phase 11: Production Readiness

## What You'll Learn

- Error handling and graceful recovery
- Retry logic with exponential backoff
- Rate limit and overload handling
- Basic testing for agent tools
- Production patterns for AI agents

## Key Concepts

### Why Production Readiness Matters

AI agents face unique challenges in production:

| Challenge | Why It Happens | Solution |
|-----------|----------------|----------|
| **Rate limits (429)** | Too many requests | Retry with backoff |
| **Overload (529)** | API is busy | Retry with longer delays |
| **Network errors** | Connection issues | Automatic retry |
| **Timeouts** | Slow responses | Timeout + retry |
| **Flaky tests** | Non-deterministic AI | Test the deterministic parts |

### The Retry Pattern

```
Request → Success? → Done!
    ↓
  Fail → Retryable? → No → Throw error
    ↓
   Yes → Wait (exponential backoff) → Retry → ...
```

## Retry System

### Exponential Backoff

The delay between retries increases exponentially:

```
Attempt 1: Fail → Wait 1s
Attempt 2: Fail → Wait 2s
Attempt 3: Fail → Wait 4s
Attempt 4: Fail → Wait 8s
```

**Formula:** `delay = initialDelay × (multiplier ^ attempt)`

**Why?** This gives the server time to recover. Retrying immediately would just make things worse.

### Jitter

Adding randomness to retry delays prevents the "thundering herd" problem:

```typescript
// Without jitter: 1000 clients all retry at exactly 2000ms
// With jitter: clients retry between 1600ms - 2400ms (spread out)

const jitter = delay * 0.2 * (Math.random() * 2 - 1);
delay = delay + jitter;
```

### Using the Retry Utility

```typescript
import { withRetry, retryOrThrow } from './utils/retry.js';

// Option 1: Get result with status
const result = await withRetry(
  () => client.messages.create(params),
  { maxRetries: 3 }
);

if (result.success) {
  console.log(result.data);
} else {
  console.error('Failed after', result.attempts, 'attempts');
}

// Option 2: Throw on failure (simpler)
const response = await retryOrThrow(
  () => client.messages.create(params),
  { maxRetries: 3 }
);
```

### Configuration Options

```typescript
const retryConfig = {
  // How many times to retry after first failure
  maxRetries: 3,

  // Initial wait time before first retry
  initialDelayMs: 1000,

  // Maximum wait time (caps exponential growth)
  maxDelayMs: 30000,

  // Multiplier for exponential backoff
  backoffMultiplier: 2,

  // Add randomness to prevent thundering herd
  jitter: true,

  // HTTP status codes that trigger retry
  retryableStatusCodes: [429, 500, 502, 503, 504, 529],

  // Retry on network errors (ECONNRESET, etc.)
  retryOnNetworkError: true,

  // Optional callback for monitoring
  onRetry: (attempt, error, nextDelayMs) => {
    console.log(`Retry ${attempt}: ${error.message}`);
  },
};
```

## Error Handling

### Anthropic API Errors

| Status | Name | Description | Retry? |
|--------|------|-------------|--------|
| 400 | Bad Request | Invalid request format | No |
| 401 | Unauthorized | Invalid API key | No |
| 403 | Forbidden | No access to resource | No |
| 404 | Not Found | Invalid endpoint | No |
| 429 | Rate Limited | Too many requests | Yes |
| 500 | Server Error | Anthropic internal error | Yes |
| 529 | Overloaded | API is busy | Yes |

### Rate Limit Headers

The API may include `retry-after` header:

```typescript
// Error response headers
{
  'retry-after': '30'  // Server says wait 30 seconds
}

// Our retry utility respects this
const delay = retryAfterMs || calculateDelay(attempt, config);
```

### Graceful Error Recovery

```typescript
try {
  const response = await agent.chat(message);
  displayResponse(response);
} catch (error) {
  if (error instanceof APIError) {
    if (error.statusCode === 429) {
      display('Rate limited. Please wait a moment.');
    } else if (error.statusCode === 529) {
      display('Service is busy. Try again shortly.');
    } else {
      display(`Error: ${error.message}`);
    }
  } else {
    display('Something went wrong. Please try again.');
  }
}
```

## Testing AI Tools

### The Challenge

AI responses are non-deterministic:
- Same prompt → Different responses
- Behavior changes with model updates
- Context affects output

### The Solution: Test the Deterministic Parts

| Component | Can Test Reliably |
|-----------|-------------------|
| Tool validation | ✓ Schema validation is deterministic |
| Tool execution | ✓ Tool logic is deterministic |
| Retry logic | ✓ Retry behavior is deterministic |
| API integration | ✗ AI responses vary |

### Simple Test Pattern

```typescript
// Test function
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
  }
}

// Example test
await test('Calculator adds correctly', async () => {
  const calc = createCalculatorTool();
  const result = await calc.run({ operation: 'add', a: 2, b: 3 });

  if (!result.success) throw new Error('Expected success');
  if (result.data.result !== 5) throw new Error(`Expected 5, got ${result.data.result}`);
});
```

### Assertion Helpers

```typescript
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
```

### What to Test

**Calculator Tool:**
- Addition, subtraction, multiplication, division
- Division by zero error
- Negative numbers
- Decimal numbers
- Missing parameters

**Memory Tool:**
- Store and recall
- Update existing memory
- Search functionality
- Delete operations
- Missing required fields

**Retry Utility:**
- Immediate success
- Success after retries
- Failure after max retries
- Non-retryable errors
- Backoff timing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm run test:calculator
npm run test:memory
npm run test:retry
```

## Production Checklist

### Before Deployment

- [ ] Retry logic enabled for API calls
- [ ] Rate limit handling tested
- [ ] Error messages are user-friendly
- [ ] Sensitive data is not logged
- [ ] Tests pass for all tools

### Configuration

```typescript
const productionConfig = {
  // Use appropriate retry settings
  retryConfig: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },

  // Don't enable all tools in production
  enableTools: true,

  // Set reasonable token limits
  maxTokens: 2048,
};
```

## Best Practices

### 1. Fail Fast on Non-Retryable Errors

Don't waste time retrying 400 (Bad Request) or 401 (Unauthorized):

```typescript
const retryableStatusCodes = [429, 500, 502, 503, 504, 529];

if (!retryableStatusCodes.includes(error.status)) {
  throw error; // Don't retry
}
```

### 2. Respect Server Hints

If the server says "wait 30 seconds", wait 30 seconds:

```typescript
const delay = error.retryAfterMs || calculateDelay(attempt);
await sleep(delay);
```

### 3. Log Retries for Debugging

```typescript
onRetry: (attempt, error, nextDelayMs) => {
  logger.warn(`Retry ${attempt}: ${error.message}, waiting ${nextDelayMs}ms`);
}
```

### 4. Set Maximum Total Time

Prevent infinite retry loops:

```typescript
const maxTotalTimeMs = 60000; // 1 minute total
const startTime = Date.now();

while (Date.now() - startTime < maxTotalTimeMs) {
  // ... retry logic
}
```

### 5. Test Edge Cases

- Network disconnection
- Server timeout
- Invalid API key
- Malformed responses

## Exercises

### Exercise 1: Custom Retry Policy

Create a retry policy for a mission-critical application:

```typescript
const missionCriticalConfig = {
  maxRetries: 5,       // More retries
  initialDelayMs: 500, // Faster initial retry
  maxDelayMs: 60000,   // Longer max wait
  // What else?
};
```

### Exercise 2: Circuit Breaker

Implement a circuit breaker that stops retrying after too many failures:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure?: Date;
  private readonly threshold = 5;
  private readonly resetTimeMs = 60000;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If circuit is open, fail fast
    // If circuit is closed, try the operation
    // Track failures and open circuit when threshold reached
  }
}
```

### Exercise 3: Retry Metrics

Add metrics tracking to the retry utility:

```typescript
interface RetryMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageRetryCount: number;
  totalRetryDelayMs: number;
}
```

## Quick Reference

### Retry Status Codes

| Code | Retry? | Notes |
|------|--------|-------|
| 429 | Yes | Rate limited - respect retry-after |
| 500 | Yes | Server error - may resolve |
| 502 | Yes | Bad gateway - transient |
| 503 | Yes | Service unavailable - transient |
| 504 | Yes | Gateway timeout - transient |
| 529 | Yes | Overloaded - longer delays |
| 400 | No | Bad request - fix input |
| 401 | No | Unauthorized - fix API key |
| 403 | No | Forbidden - check permissions |
| 404 | No | Not found - fix endpoint |

### Backoff Formula

```
delay = min(initialDelay × multiplier^attempt, maxDelay) ± jitter
```

### Test Commands

```bash
npm test                # Run all tests
npm run test:calculator # Calculator tests only
npm run test:memory     # Memory tool tests only
npm run test:retry      # Retry utility tests only
```

## What's Next?

In **Phase 12 (Vision & Multi-modal)**, you'll learn to:
- Process images with Claude
- Handle multi-modal inputs
- Build vision-based tools
- Create agents that can "see"

The retry and error handling patterns you learned here will be essential for handling image processing errors!
