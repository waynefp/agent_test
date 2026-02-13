/**
 * Rate Limiter - Request Rate Control (Phase 18)
 *
 * BEGINNER NOTE: Rate limiting prevents abuse by restricting how many
 * requests can be made in a time window. It's like a bouncer who says
 * "You can only enter the club 10 times per hour."
 *
 * This uses the "sliding window" algorithm, which is more accurate than
 * simple fixed windows (e.g., "10 per minute starting at :00 seconds").
 */

import { GuardrailsResult, GuardrailViolation } from '../types/guardrails.types.js';

/**
 * Rate limiter using sliding window algorithm
 *
 * BEGINNER NOTE: The sliding window algorithm works like this:
 * 1. Store timestamps of all recent requests
 * 2. When a new request comes in, remove old timestamps outside the window
 * 3. Count remaining timestamps - if >= limit, block the request
 * 4. Otherwise allow it and add current timestamp
 *
 * Example: Limit is 5 requests per minute
 * - At 12:00:00, you make request #1 → allowed (1/5)
 * - At 12:00:30, you make request #5 → allowed (5/5)
 * - At 12:00:45, you make request #6 → BLOCKED (would be 6/5)
 * - At 12:01:01, you make request #7 → allowed (request #1 expired)
 */
export class RateLimiter {
  /**
   * Stores request timestamps per conversation
   * BEGINNER NOTE: Map is like an object but with better performance
   * for frequent additions/deletions. Key is conversationId, value is
   * array of timestamps in milliseconds.
   */
  private requests: Map<string, number[]> = new Map();

  /**
   * Check if a request is within rate limits
   *
   * @param conversationId - Unique conversation identifier
   * @param requestsPerMinute - Maximum requests allowed per minute
   * @returns Validation result (allowed or blocked)
   */
  checkLimit(conversationId: string, requestsPerMinute: number): GuardrailsResult {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute ago (60000 ms)

    // BEGINNER NOTE: Get existing timestamps, or empty array if this is
    // the first request for this conversation
    const timestamps = this.requests.get(conversationId) || [];

    // BEGINNER NOTE: Filter keeps only timestamps within the window.
    // Anything older than 1 minute ago is discarded.
    const recentTimestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if limit would be exceeded
    if (recentTimestamps.length >= requestsPerMinute) {
      // BEGINNER NOTE: Calculate how long until the oldest request expires
      const oldestTimestamp = Math.min(...recentTimestamps);
      const resetInMs = oldestTimestamp + 60000 - now;
      const resetInSeconds = Math.ceil(resetInMs / 1000);

      return {
        allowed: false,
        reason: GuardrailViolation.RATE_LIMIT_EXCEEDED,
        message: `Rate limit exceeded: ${requestsPerMinute} requests per minute. Try again in ${resetInSeconds}s.`,
      };
    }

    // BEGINNER NOTE: Request is allowed - add current timestamp and save
    recentTimestamps.push(now);
    this.requests.set(conversationId, recentTimestamps);

    return { allowed: true };
  }

  /**
   * Get current usage for a conversation
   *
   * @param conversationId - Conversation to check
   * @returns Number of requests in current window
   */
  getUsage(conversationId: string): number {
    const now = Date.now();
    const windowStart = now - 60000;
    const timestamps = this.requests.get(conversationId) || [];
    const recentTimestamps = timestamps.filter((ts) => ts > windowStart);
    return recentTimestamps.length;
  }

  /**
   * Reset rate limit for a conversation
   *
   * BEGINNER NOTE: Useful for testing, or for giving users a "fresh start"
   * after they've hit the limit.
   *
   * @param conversationId - Conversation to reset
   */
  reset(conversationId: string): void {
    this.requests.delete(conversationId);
  }

  /**
   * Clean up old data
   *
   * BEGINNER NOTE: Memory management - remove conversations with no
   * recent activity to prevent memory leaks in long-running processes.
   * Call this periodically (e.g., every hour).
   *
   * @param maxAgeMs - Remove conversations older than this (default 1 hour)
   */
  cleanup(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    const cutoff = now - maxAgeMs;

    for (const [conversationId, timestamps] of this.requests.entries()) {
      // Filter out old timestamps
      const recentTimestamps = timestamps.filter((ts) => ts > cutoff);

      if (recentTimestamps.length === 0) {
        // No recent activity - remove this conversation
        this.requests.delete(conversationId);
      } else {
        // Update with filtered timestamps
        this.requests.set(conversationId, recentTimestamps);
      }
    }
  }

  /**
   * Get statistics across all conversations
   *
   * BEGINNER NOTE: Useful for monitoring and analytics. You can track
   * how many conversations are hitting limits, average request rate, etc.
   */
  getStats(): {
    totalConversations: number;
    activeConversations: number;
    totalRequests: number;
  } {
    const now = Date.now();
    const windowStart = now - 60000;

    let totalRequests = 0;
    let activeConversations = 0;

    for (const timestamps of this.requests.values()) {
      const recentTimestamps = timestamps.filter((ts) => ts > windowStart);
      if (recentTimestamps.length > 0) {
        activeConversations++;
        totalRequests += recentTimestamps.length;
      }
    }

    return {
      totalConversations: this.requests.size,
      activeConversations,
      totalRequests,
    };
  }
}
