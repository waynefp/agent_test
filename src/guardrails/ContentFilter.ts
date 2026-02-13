/**
 * Content Filter - Harmful Content Detection (Phase 18)
 *
 * BEGINNER NOTE: This class blocks requests for dangerous, illegal,
 * or unethical content. It's like a bouncer at a club - it checks
 * requests before they get to the LLM and blocks harmful ones.
 *
 * Important: This is a basic filter for demonstration. Production systems
 * would use more sophisticated methods like:
 * - ML-based classifiers (like OpenAI Moderation API)
 * - Comprehensive harmful content databases
 * - Multi-language support
 */

import { GuardrailsResult, GuardrailViolation } from '../types/guardrails.types.js';

/**
 * Content category for harmful content classification
 */
export interface ContentCategory {
  category: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Filters harmful or illegal content requests
 */
export class ContentFilter {
  /**
   * Patterns that indicate harmful content requests
   *
   * BEGINNER NOTE: These are organized by category and severity.
   * High severity = immediate block, Medium = log and block,
   * Low = log but might allow depending on context.
   */
  private readonly harmfulPatterns: ContentCategory[] = [
    // Violence
    {
      category: 'violence',
      pattern: /\b(how\s+to|ways\s+to)\s+(kill|murder|hurt|harm|torture|attack)\s+(someone|people|a\s+person)/i,
      severity: 'high',
    },
    {
      category: 'violence',
      pattern: /\b(best|easiest)\s+way\s+to\s+(assassinate|eliminate)\b/i,
      severity: 'high',
    },

    // Illegal activities
    {
      category: 'illegal',
      pattern: /\b(how\s+to|ways\s+to)\s+(hack|crack|break\s+into)\s+(accounts?|systems?|networks?|databases?)/i,
      severity: 'high',
    },
    {
      category: 'illegal',
      pattern: /\b(how\s+to)\s+(steal|rob|shoplift|embezzle)/i,
      severity: 'high',
    },
    {
      category: 'illegal',
      pattern: /\b(make|create|produce)\s+(fake|counterfeit)\s+(money|currency|bills|ids?|passports?)/i,
      severity: 'high',
    },

    // Dangerous substances
    {
      category: 'dangerous',
      pattern: /\b(how\s+to|ways\s+to|recipe\s+for)\s+(make|create|build|manufacture)\s+(explosives?|bombs?|weapons?|poison)/i,
      severity: 'high',
    },
    {
      category: 'dangerous',
      pattern: /\b(how\s+to|where\s+to)\s+(buy|purchase|obtain)\s+(illegal\s+)?(drugs|narcotics|meth|cocaine|heroin)/i,
      severity: 'high',
    },

    // Self-harm
    {
      category: 'self-harm',
      pattern: /\b(how\s+to|ways\s+to|best\s+way\s+to)\s+(kill\s+myself|commit\s+suicide|end\s+my\s+life)/i,
      severity: 'high',
    },

    // Privacy violations
    {
      category: 'privacy',
      pattern: /\b(how\s+to)\s+(dox|doxx|find\s+personal\s+info|stalk)\b/i,
      severity: 'medium',
    },

    // Fraud
    {
      category: 'fraud',
      pattern: /\b(how\s+to)\s+(scam|defraud|cheat|trick)\s+(people|customers|users)/i,
      severity: 'medium',
    },
  ];

  /**
   * Filters content for harmful patterns
   *
   * BEGINNER NOTE: This method checks the input against all harmful
   * content patterns. If a match is found, it returns a GuardrailsResult
   * with allowed=false and details about what was detected.
   *
   * @param input - The user's message to check
   * @returns Validation result (allowed or blocked with reason)
   */
  filterContent(input: string): GuardrailsResult {
    for (const { category, pattern, severity } of this.harmfulPatterns) {
      if (pattern.test(input)) {
        return {
          allowed: false,
          reason: GuardrailViolation.HARMFUL_CONTENT,
          message: `Request blocked: ${category} content detected (severity: ${severity})`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Classify content without blocking
   *
   * BEGINNER NOTE: This is useful for logging/monitoring without
   * blocking the request. You might allow the request but log it
   * for review, or apply different rules for different users.
   *
   * @param input - The text to classify
   * @returns Category and severity if harmful content detected
   */
  classifyContent(
    input: string
  ): { harmful: boolean; category?: string; severity?: string; pattern?: string } {
    for (const { category, pattern, severity } of this.harmfulPatterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          harmful: true,
          category,
          severity,
          pattern: match[0],
        };
      }
    }

    return { harmful: false };
  }

  /**
   * Add custom harmful content pattern
   *
   * BEGINNER NOTE: This allows you to extend the filter with
   * domain-specific patterns. For example, if you're building
   * a finance agent, you might block "insider trading" requests.
   *
   * @param category - Category name (e.g., "finance-fraud")
   * @param pattern - Regex pattern to match
   * @param severity - How serious this violation is
   */
  addPattern(category: string, pattern: RegExp, severity: 'low' | 'medium' | 'high'): void {
    this.harmfulPatterns.push({ category, pattern, severity });
  }

  /**
   * Get all registered patterns (for debugging/monitoring)
   */
  getPatterns(): ContentCategory[] {
    return [...this.harmfulPatterns];
  }
}
