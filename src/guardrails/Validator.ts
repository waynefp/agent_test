/**
 * Guardrails Validator - Main Orchestrator (Phase 18)
 *
 * BEGINNER NOTE: This is the "conductor" of the guardrails orchestra.
 * It coordinates all individual guardrails (InputSanitizer, ContentFilter,
 * RateLimiter, TokenQuota) and runs them in sequence.
 *
 * Think of it like airport security:
 * 1. ID check (prompt injection detection)
 * 2. Banned items check (harmful content)
 * 3. Ticket validation (rate limiting)
 * 4. Luggage weight limit (token quota)
 *
 * If any check fails, the request is blocked immediately.
 */

import {
  GuardrailsConfig,
  GuardrailsResult,
  GuardrailViolation,
  AuditLogEntry,
  ValidationContext,
} from '../types/guardrails.types.js';
import { InputSanitizer } from './InputSanitizer.js';
import { ContentFilter } from './ContentFilter.js';
import { RateLimiter } from './RateLimiter.js';
import { TokenQuota } from './TokenQuota.js';
import { Logger } from '../utils/logger.js';

/**
 * Main guardrails validator - coordinates all safety checks
 */
export class GuardrailsValidator {
  private sanitizer: InputSanitizer;
  private contentFilter: ContentFilter;
  private rateLimiter: RateLimiter;
  private tokenQuota: TokenQuota;
  private auditLog: AuditLogEntry[] = [];
  private logger: Logger;

  /**
   * BEGINNER NOTE: The constructor creates instances of all guardrail
   * components. Each component is independent and can be used separately,
   * but we coordinate them here for convenience.
   */
  constructor(private config: GuardrailsConfig) {
    this.sanitizer = new InputSanitizer();
    this.contentFilter = new ContentFilter();
    this.rateLimiter = new RateLimiter();
    this.tokenQuota = new TokenQuota();
    this.logger = new Logger();
  }

  /**
   * Validate user input against all enabled guardrails
   *
   * BEGINNER NOTE: This is the main entry point. It runs all enabled
   * guardrails in sequence and returns the first violation found.
   * If all checks pass, it returns { allowed: true }.
   *
   * @param input - User's message to validate
   * @param context - Conversation context (ID, token usage, etc.)
   * @returns Validation result (allowed or blocked with reason)
   */
  async validate(input: string, context: ValidationContext): Promise<GuardrailsResult> {
    // BEGINNER NOTE: Each check is wrapped in an if-block that checks
    // the config. This allows fine-grained control - you can enable
    // only the guardrails you need.

    // 1. Check prompt injection
    if (this.config.detectPromptInjection) {
      const injection = this.sanitizer.detectInjection(input);
      if (injection.detected) {
        this.logAudit(context.conversationId, 'guardrail_triggered', {
          violation: GuardrailViolation.PROMPT_INJECTION,
          pattern: injection.pattern,
          matchedText: injection.matchedText,
        });

        this.logger.warn('Prompt injection detected', {
          pattern: injection.pattern,
          conversationId: context.conversationId,
        });

        return {
          allowed: false,
          reason: GuardrailViolation.PROMPT_INJECTION,
          message: 'Potential prompt injection detected. Please rephrase your request.',
        };
      }
    }

    // 2. Check harmful content
    if (this.config.filterHarmfulContent) {
      const contentResult = this.contentFilter.filterContent(input);
      if (!contentResult.allowed) {
        this.logAudit(context.conversationId, 'guardrail_triggered', {
          violation: contentResult.reason,
          message: contentResult.message,
        });

        this.logger.warn('Harmful content detected', {
          reason: contentResult.message,
          conversationId: context.conversationId,
        });

        return contentResult;
      }
    }

    // 3. Check URL sanitization
    if (this.config.sanitizeUrls) {
      const urlCheck = this.sanitizer.validateUrlsInText(input);
      if (!urlCheck.valid) {
        this.logAudit(context.conversationId, 'guardrail_triggered', {
          violation: GuardrailViolation.INVALID_URL,
          invalidUrls: urlCheck.invalidUrls,
        });

        this.logger.warn('Invalid URLs detected', {
          urls: urlCheck.invalidUrls,
          conversationId: context.conversationId,
        });

        return {
          allowed: false,
          reason: GuardrailViolation.INVALID_URL,
          message: `Invalid or blocked URLs detected: ${urlCheck.invalidUrls.join(', ')}`,
        };
      }
    }

    // 4. Check rate limit
    if (this.config.enableRateLimiting && this.config.requestsPerMinute) {
      const rateResult = this.rateLimiter.checkLimit(
        context.conversationId,
        this.config.requestsPerMinute
      );
      if (!rateResult.allowed) {
        this.logAudit(context.conversationId, 'guardrail_triggered', {
          violation: rateResult.reason,
          message: rateResult.message,
        });

        this.logger.warn('Rate limit exceeded', {
          conversationId: context.conversationId,
          limit: this.config.requestsPerMinute,
        });

        return rateResult;
      }
    }

    // 5. Check token quota
    if (this.config.maxTokensPerConversation) {
      // BEGINNER NOTE: We check with estimated tokens (0 for now - actual
      // usage will be tracked after the API call). This ensures we don't
      // even attempt requests that would exceed the quota.
      const estimatedTokens = this.estimateTokens(input);

      const quotaResult = this.tokenQuota.checkQuota(
        context.conversationId,
        estimatedTokens,
        this.config.maxTokensPerConversation
      );

      if (!quotaResult.allowed) {
        this.logAudit(context.conversationId, 'guardrail_triggered', {
          violation: quotaResult.reason,
          message: quotaResult.message,
          currentUsage: context.totalTokensUsed,
        });

        this.logger.warn('Token quota exceeded', {
          conversationId: context.conversationId,
          usage: context.totalTokensUsed,
          max: this.config.maxTokensPerConversation,
        });

        return quotaResult;
      }

      // Check if near limit and log warning
      if (
        this.tokenQuota.isNearLimit(context.conversationId, this.config.maxTokensPerConversation)
      ) {
        const info = this.tokenQuota.getUsageInfo(
          context.conversationId,
          this.config.maxTokensPerConversation
        );
        this.logger.info('Approaching token quota', {
          conversationId: context.conversationId,
          usage: info.formatted,
        });
      }
    }

    // 6. Run custom validators
    if (this.config.customValidators) {
      for (const validator of this.config.customValidators) {
        const result = await validator(input, context);
        if (!result.valid) {
          this.logAudit(context.conversationId, 'guardrail_triggered', {
            violation: GuardrailViolation.CUSTOM_VALIDATION_FAILED,
            reason: result.reason,
          });

          this.logger.warn('Custom validation failed', {
            reason: result.reason,
            conversationId: context.conversationId,
          });

          return {
            allowed: false,
            reason: GuardrailViolation.CUSTOM_VALIDATION_FAILED,
            message: result.reason,
          };
        }
      }
    }

    // All checks passed
    this.logAudit(context.conversationId, 'message_sent', {
      messageLength: input.length,
      messageCount: context.messageCount,
    });

    return { allowed: true };
  }

  /**
   * Track token usage after API call
   *
   * BEGINNER NOTE: Call this after each API request to update the
   * conversation's token quota. The tokens come from the API response.
   */
  trackTokenUsage(conversationId: string, tokens: number): void {
    if (this.config.maxTokensPerConversation) {
      this.tokenQuota.trackUsage(conversationId, tokens);
    }
  }

  /**
   * Get token usage info for display
   */
  getTokenUsageInfo(
    conversationId: string
  ): { used: number; remaining: number; percent: number; formatted: string } | null {
    if (!this.config.maxTokensPerConversation) {
      return null;
    }

    return this.tokenQuota.getUsageInfo(conversationId, this.config.maxTokensPerConversation);
  }

  /**
   * Reset all guardrails for a conversation
   *
   * BEGINNER NOTE: Use this when starting a new conversation or when
   * you want to give the user a fresh start.
   */
  reset(conversationId: string): void {
    this.rateLimiter.reset(conversationId);
    this.tokenQuota.reset(conversationId);
    this.logger.info('Guardrails reset', { conversationId });
  }

  /**
   * Get audit log entries
   */
  getAuditLog(conversationId?: string): AuditLogEntry[] {
    if (conversationId) {
      return this.auditLog.filter((entry) => entry.conversationId === conversationId);
    }
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Get statistics across all conversations
   */
  getStats(): {
    rateLimiter: ReturnType<RateLimiter['getStats']>;
    tokenQuota: ReturnType<TokenQuota['getStats']>;
    auditLogSize: number;
  } {
    return {
      rateLimiter: this.rateLimiter.getStats(),
      tokenQuota: this.tokenQuota.getStats(),
      auditLogSize: this.auditLog.length,
    };
  }

  /**
   * Add audit log entry
   *
   * BEGINNER NOTE: Private method for internal use. Logs events only
   * if audit logging is enabled in config.
   */
  private logAudit(
    conversationId: string,
    event: AuditLogEntry['event'],
    details: Record<string, unknown>
  ): void {
    if (this.config.enableAuditLog) {
      this.auditLog.push({
        timestamp: new Date(),
        conversationId,
        event,
        details,
      });
    }
  }

  /**
   * Estimate tokens in input
   *
   * BEGINNER NOTE: Rough estimation for token quota checking.
   * Real token count comes from the API response, but we need an
   * estimate BEFORE making the call to check if we have budget.
   *
   * Rule of thumb: ~4 characters per token for English text.
   */
  private estimateTokens(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
