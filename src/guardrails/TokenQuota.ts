/**
 * Token Quota Manager - Token Budget Enforcement (Phase 18)
 *
 * BEGINNER NOTE: This class enforces token budgets per conversation
 * to prevent excessive API costs. It's like a prepaid phone plan -
 * once you hit your limit, no more calls until you reset.
 *
 * Why this matters:
 * - AI API calls are expensive (billed per token)
 * - Without limits, a bug or malicious user could rack up huge bills
 * - Token quotas protect your budget while allowing normal use
 */

import { GuardrailsResult, GuardrailViolation } from '../types/guardrails.types.js';

/**
 * Tracks token usage and enforces quotas
 */
export class TokenQuota {
  /**
   * Cumulative token usage per conversation
   * BEGINNER NOTE: Map<conversationId, totalTokensUsed>
   */
  private usage: Map<string, number> = new Map();

  /**
   * Check if adding tokens would exceed quota
   *
   * BEGINNER NOTE: This is called BEFORE making an API call to check
   * if the conversation has budget remaining. If the quota would be
   * exceeded, we block the request and save the API cost.
   *
   * @param conversationId - Unique conversation identifier
   * @param tokensToAdd - Estimated tokens for the next request
   * @param maxTokens - Maximum tokens allowed for this conversation
   * @returns Validation result (allowed or blocked)
   */
  checkQuota(
    conversationId: string,
    tokensToAdd: number,
    maxTokens: number
  ): GuardrailsResult {
    const currentUsage = this.usage.get(conversationId) || 0;
    const newUsage = currentUsage + tokensToAdd;

    if (newUsage > maxTokens) {
      // BEGINNER NOTE: Calculate remaining tokens and percentage used
      const remaining = Math.max(0, maxTokens - currentUsage);
      const percentUsed = Math.round((currentUsage / maxTokens) * 100);

      return {
        allowed: false,
        reason: GuardrailViolation.TOKEN_QUOTA_EXCEEDED,
        message: `Token quota exceeded: ${currentUsage.toLocaleString()}/${maxTokens.toLocaleString()} tokens used (${percentUsed}%). Only ${remaining.toLocaleString()} tokens remaining.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Track token usage after a request completes
   *
   * BEGINNER NOTE: This is called AFTER an API call to record actual
   * token usage. The tokens come from the API response (input_tokens
   * + output_tokens from Claude's usage stats).
   *
   * @param conversationId - Conversation to track
   * @param tokens - Actual tokens used (from API response)
   */
  trackUsage(conversationId: string, tokens: number): void {
    const current = this.usage.get(conversationId) || 0;
    this.usage.set(conversationId, current + tokens);
  }

  /**
   * Get current usage for a conversation
   *
   * @param conversationId - Conversation to check
   * @returns Total tokens used in this conversation
   */
  getUsage(conversationId: string): number {
    return this.usage.get(conversationId) || 0;
  }

  /**
   * Get usage with percentage
   *
   * BEGINNER NOTE: Returns formatted usage stats for display to users.
   * Example: "You've used 45,231 / 100,000 tokens (45%)"
   *
   * @param conversationId - Conversation to check
   * @param maxTokens - Max tokens for this conversation
   * @returns Detailed usage information
   */
  getUsageInfo(
    conversationId: string,
    maxTokens: number
  ): {
    used: number;
    remaining: number;
    percent: number;
    formatted: string;
  } {
    const used = this.getUsage(conversationId);
    const remaining = Math.max(0, maxTokens - used);
    const percent = Math.round((used / maxTokens) * 100);

    return {
      used,
      remaining,
      percent,
      formatted: `${used.toLocaleString()} / ${maxTokens.toLocaleString()} tokens (${percent}%)`,
    };
  }

  /**
   * Reset quota for a conversation
   *
   * BEGINNER NOTE: Clears all usage data for a conversation. Useful when:
   * - Starting a new conversation
   * - User purchases more tokens
   * - Testing
   *
   * @param conversationId - Conversation to reset
   */
  reset(conversationId: string): void {
    this.usage.delete(conversationId);
  }

  /**
   * Check if conversation is near quota limit
   *
   * BEGINNER NOTE: Useful for showing warnings before hitting the limit.
   * Example: "You've used 90% of your quota - 5,000 tokens remaining"
   *
   * @param conversationId - Conversation to check
   * @param maxTokens - Max tokens for this conversation
   * @param threshold - Warning threshold (0.0 to 1.0, default 0.8 = 80%)
   * @returns True if usage is above threshold
   */
  isNearLimit(conversationId: string, maxTokens: number, threshold: number = 0.8): boolean {
    const used = this.getUsage(conversationId);
    const percentUsed = used / maxTokens;
    return percentUsed >= threshold;
  }

  /**
   * Get statistics across all conversations
   *
   * BEGINNER NOTE: Analytics for monitoring total API usage and costs.
   * In production, you'd track this per user, per day, etc.
   */
  getStats(): {
    totalConversations: number;
    totalTokensUsed: number;
    averageTokensPerConversation: number;
  } {
    let totalTokens = 0;
    for (const tokens of this.usage.values()) {
      totalTokens += tokens;
    }

    const totalConversations = this.usage.size;
    const averageTokens = totalConversations > 0 ? totalTokens / totalConversations : 0;

    return {
      totalConversations,
      totalTokensUsed: totalTokens,
      averageTokensPerConversation: Math.round(averageTokens),
    };
  }

  /**
   * Estimate cost based on token usage
   *
   * BEGINNER NOTE: Converts tokens to estimated cost in USD.
   * Prices are approximate and vary by model. This helps users
   * understand the financial impact of their usage.
   *
   * @param tokens - Number of tokens
   * @param pricePerMillionTokens - Price in USD (default: Claude Sonnet pricing)
   * @returns Estimated cost in USD
   */
  estimateCost(tokens: number, pricePerMillionTokens: number = 3.0): number {
    return (tokens / 1_000_000) * pricePerMillionTokens;
  }
}
