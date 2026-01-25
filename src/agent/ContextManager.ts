/**
 * Context Manager - Token Tracking and Context Window Management
 *
 * Handles the "memory" limits of the conversation. Claude has a maximum
 * context window (the amount of text it can "see" at once), so we need
 * to manage long conversations.
 *
 * BEGINNER NOTE: Think of the context window like Claude's "short-term memory".
 * It can only hold so much at once. When the conversation gets too long,
 * we need strategies to decide what to keep and what to summarize/remove.
 *
 * Phase 8: Context Window Management
 */

import type { Message, TextContent } from '../types/conversation.types.js';
import { logger } from '../utils/logger.js';

/**
 * Context strategy types
 * BEGINNER NOTE: Different ways to handle when the context gets too full
 */
export type ContextStrategy =
  | 'none'           // No management - will error if too large
  | 'sliding_window' // Remove oldest messages
  | 'summarize';     // Summarize older messages (requires API call)

/**
 * Context manager configuration
 */
export interface ContextManagerConfig {
  /** Maximum tokens allowed (model's context window) */
  maxContextTokens: number;

  /** Strategy to use when approaching limit */
  strategy: ContextStrategy;

  /** Percentage at which to warn (0.0 - 1.0) */
  warningThreshold: number;

  /** Percentage at which to take action (0.0 - 1.0) */
  actionThreshold: number;

  /** Number of recent messages to always keep (for sliding window) */
  keepRecentMessages: number;

  /** Target token count after trimming (as percentage of max) */
  targetAfterTrim: number;
}

/**
 * Token usage statistics
 */
export interface TokenStats {
  /** Estimated total tokens in conversation */
  estimatedTotal: number;

  /** Percentage of context window used */
  percentUsed: number;

  /** Tokens remaining before limit */
  remaining: number;

  /** Whether we're in the warning zone */
  isWarning: boolean;

  /** Whether we need to take action */
  needsAction: boolean;

  /** Number of messages in conversation */
  messageCount: number;

  /** Average tokens per message */
  avgTokensPerMessage: number;
}

/**
 * Result of a context management action
 */
export interface ContextActionResult {
  /** Action taken */
  action: 'none' | 'trimmed' | 'summarized';

  /** Messages removed */
  messagesRemoved: number;

  /** Tokens freed */
  tokensFreed: number;

  /** New token count */
  newTokenCount: number;

  /** Summary text (if summarization was used) */
  summary?: string;
}

/**
 * Default context manager configuration
 * BEGINNER NOTE: These defaults are conservative - they trigger early
 * to prevent hitting hard limits.
 */
export const DEFAULT_CONTEXT_CONFIG: ContextManagerConfig = {
  maxContextTokens: 190000,   // Claude Sonnet has 200k, leave buffer
  strategy: 'sliding_window',
  warningThreshold: 0.7,      // Warn at 70%
  actionThreshold: 0.85,      // Take action at 85%
  keepRecentMessages: 10,     // Always keep last 10 messages
  targetAfterTrim: 0.5,       // Trim down to 50% of max
};

/**
 * Context Manager
 * BEGINNER NOTE: This class helps us keep track of how much "memory"
 * we're using and manages it when it gets too full.
 */
export class ContextManager {
  private config: ContextManagerConfig;
  private tokenCache: Map<string, number> = new Map();

  constructor(config?: Partial<ContextManagerConfig>) {
    this.config = { ...DEFAULT_CONTEXT_CONFIG, ...config };

    logger.debug('ContextManager initialized', {
      maxTokens: this.config.maxContextTokens,
      strategy: this.config.strategy,
      warningThreshold: `${this.config.warningThreshold * 100}%`,
    });
  }

  /**
   * Estimate token count for a string
   * BEGINNER NOTE: We use a simple heuristic - ~4 characters per token.
   * This is a rough estimate. For production, you'd use a tokenizer library.
   *
   * Claude uses a similar tokenizer to GPT models. Common patterns:
   * - 1 token ≈ 4 characters in English
   * - 1 token ≈ 0.75 words
   * - Code and special characters may use more tokens
   *
   * @param text - The text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    if (!text) return 0;

    // Check cache first
    const cached = this.tokenCache.get(text);
    if (cached !== undefined) return cached;

    // Simple heuristic: ~4 characters per token
    // Add some overhead for message structure
    const estimate = Math.ceil(text.length / 4) + 4;

    // Cache the result (limit cache size)
    if (this.tokenCache.size > 1000) {
      // Clear old entries (simple LRU approximation)
      const firstKey = this.tokenCache.keys().next().value;
      if (firstKey) this.tokenCache.delete(firstKey);
    }
    this.tokenCache.set(text, estimate);

    return estimate;
  }

  /**
   * Estimate tokens for a message
   * BEGINNER NOTE: Messages have structure (role, content) that adds tokens
   *
   * @param message - The message to estimate
   * @returns Estimated token count
   */
  estimateMessageTokens(message: Message): number {
    let tokens = 4; // Base overhead for message structure

    // Add tokens for role
    tokens += 2; // "user" or "assistant" ~ 2 tokens

    // Add tokens for content
    for (const block of message.content) {
      if (block.type === 'text') {
        tokens += this.estimateTokens((block as TextContent).text);
      } else if (block.type === 'tool_use') {
        // Tool use blocks have name, id, and input
        tokens += 20; // Overhead for structure
        tokens += this.estimateTokens(JSON.stringify((block as any).input || {}));
      } else if (block.type === 'tool_result') {
        tokens += 10; // Overhead
        tokens += this.estimateTokens(String((block as any).content || ''));
      }
    }

    return tokens;
  }

  /**
   * Estimate total tokens for a conversation
   *
   * @param messages - Array of messages
   * @returns Estimated token count
   */
  estimateConversationTokens(messages: Message[]): number {
    return messages.reduce((total, msg) => total + this.estimateMessageTokens(msg), 0);
  }

  /**
   * Get current token statistics
   *
   * @param messages - Current conversation messages
   * @returns Token statistics
   */
  getStats(messages: Message[]): TokenStats {
    const estimatedTotal = this.estimateConversationTokens(messages);
    const percentUsed = estimatedTotal / this.config.maxContextTokens;
    const remaining = this.config.maxContextTokens - estimatedTotal;
    const messageCount = messages.length;

    return {
      estimatedTotal,
      percentUsed,
      remaining,
      isWarning: percentUsed >= this.config.warningThreshold,
      needsAction: percentUsed >= this.config.actionThreshold,
      messageCount,
      avgTokensPerMessage: messageCount > 0 ? Math.round(estimatedTotal / messageCount) : 0,
    };
  }

  /**
   * Check if context management action is needed
   *
   * @param messages - Current messages
   * @returns Whether action is needed
   */
  needsAction(messages: Message[]): boolean {
    const stats = this.getStats(messages);
    return stats.needsAction;
  }

  /**
   * Check if we should warn the user
   *
   * @param messages - Current messages
   * @returns Whether to show a warning
   */
  shouldWarn(messages: Message[]): boolean {
    const stats = this.getStats(messages);
    return stats.isWarning && !stats.needsAction;
  }

  /**
   * Apply sliding window strategy
   * BEGINNER NOTE: This removes the oldest messages, keeping only recent ones.
   * It's simple but loses context from earlier in the conversation.
   *
   * @param messages - Current messages
   * @returns Trimmed messages and action result
   */
  applySlidingWindow(messages: Message[]): {
    messages: Message[];
    result: ContextActionResult;
  } {
    const originalCount = messages.length;
    const originalTokens = this.estimateConversationTokens(messages);

    // Calculate target token count
    const targetTokens = Math.floor(
      this.config.maxContextTokens * this.config.targetAfterTrim
    );

    // Always keep the minimum number of recent messages
    let trimmedMessages = [...messages];

    // Keep removing from the front until we're under target
    while (
      trimmedMessages.length > this.config.keepRecentMessages &&
      this.estimateConversationTokens(trimmedMessages) > targetTokens
    ) {
      // Remove from the beginning (oldest messages)
      trimmedMessages.shift();
    }

    const newTokenCount = this.estimateConversationTokens(trimmedMessages);
    const messagesRemoved = originalCount - trimmedMessages.length;
    const tokensFreed = originalTokens - newTokenCount;

    logger.info(`Sliding window applied: removed ${messagesRemoved} messages, freed ~${tokensFreed} tokens`);

    return {
      messages: trimmedMessages,
      result: {
        action: messagesRemoved > 0 ? 'trimmed' : 'none',
        messagesRemoved,
        tokensFreed,
        newTokenCount,
      },
    };
  }

  /**
   * Create a summary of messages that will be removed
   * BEGINNER NOTE: This creates a text summary that can be used to preserve
   * some context about what was discussed earlier.
   *
   * @param messages - Messages to summarize
   * @returns Summary text
   */
  createSummaryText(messages: Message[]): string {
    if (messages.length === 0) return '';

    const topics: string[] = [];
    let turnCount = 0;

    for (const msg of messages) {
      if (msg.role === 'user') {
        turnCount++;
        // Extract first line or first 100 chars as topic hint
        const textBlocks = msg.content.filter(b => b.type === 'text') as TextContent[];
        if (textBlocks.length > 0) {
          const text = textBlocks[0].text;
          const firstLine = text.split('\n')[0].slice(0, 100);
          topics.push(firstLine);
        }
      }
    }

    // Create a condensed summary
    const uniqueTopics = [...new Set(topics)].slice(0, 5); // Max 5 unique topics
    return `[Earlier conversation summary - ${turnCount} turns covering: ${uniqueTopics.join('; ')}]`;
  }

  /**
   * Apply context management based on configured strategy
   * BEGINNER NOTE: This is the main method to call when context is too full.
   *
   * @param messages - Current messages
   * @returns Updated messages and action result
   */
  applyStrategy(messages: Message[]): {
    messages: Message[];
    result: ContextActionResult;
    summary?: string;
  } {
    const stats = this.getStats(messages);

    if (!stats.needsAction) {
      return {
        messages,
        result: {
          action: 'none',
          messagesRemoved: 0,
          tokensFreed: 0,
          newTokenCount: stats.estimatedTotal,
        },
      };
    }

    switch (this.config.strategy) {
      case 'none':
        // Do nothing, let it potentially error
        logger.warn('Context limit approaching but strategy is "none"');
        return {
          messages,
          result: {
            action: 'none',
            messagesRemoved: 0,
            tokensFreed: 0,
            newTokenCount: stats.estimatedTotal,
          },
        };

      case 'sliding_window': {
        const { messages: trimmed, result } = this.applySlidingWindow(messages);
        return { messages: trimmed, result };
      }

      case 'summarize': {
        // For summarization, we'll do sliding window but also provide a summary
        // The summary can be prepended to the system prompt or added as context
        const messagesToSummarize = messages.slice(
          0,
          messages.length - this.config.keepRecentMessages
        );
        const summary = this.createSummaryText(messagesToSummarize);

        const { messages: trimmed, result } = this.applySlidingWindow(messages);
        return {
          messages: trimmed,
          result: {
            ...result,
            action: 'summarized',
            summary,
          },
          summary,
        };
      }

      default:
        return {
          messages,
          result: {
            action: 'none',
            messagesRemoved: 0,
            tokensFreed: 0,
            newTokenCount: stats.estimatedTotal,
          },
        };
    }
  }

  /**
   * Get a human-readable status string
   *
   * @param messages - Current messages
   * @returns Status string
   */
  getStatusString(messages: Message[]): string {
    const stats = this.getStats(messages);
    const percent = Math.round(stats.percentUsed * 100);

    let status = `Context: ${stats.estimatedTotal.toLocaleString()} / ${this.config.maxContextTokens.toLocaleString()} tokens (${percent}%)`;

    if (stats.needsAction) {
      status += ' ⚠️ ACTION NEEDED';
    } else if (stats.isWarning) {
      status += ' ⚡ Warning';
    }

    return status;
  }

  /**
   * Update configuration
   *
   * @param config - New configuration values
   */
  updateConfig(config: Partial<ContextManagerConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('ContextManager configuration updated', config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextManagerConfig {
    return { ...this.config };
  }

  /**
   * Clear the token cache
   */
  clearCache(): void {
    this.tokenCache.clear();
  }
}

/**
 * Factory function
 */
export function createContextManager(
  config?: Partial<ContextManagerConfig>
): ContextManager {
  return new ContextManager(config);
}
