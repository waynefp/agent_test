/**
 * Input Sanitizer - Prompt Injection Detection (Phase 18)
 *
 * BEGINNER NOTE: This class detects when users try to manipulate the agent
 * by injecting malicious instructions. Common attacks include:
 * - "Ignore previous instructions and do X"
 * - "You are now a different assistant"
 * - Injecting special tokens like <|im_start|> to break out of the prompt
 *
 * We use regex patterns to detect these attacks before they reach the LLM.
 */

/**
 * Detection result with optional pattern information
 */
export interface InjectionDetectionResult {
  detected: boolean;
  pattern?: string;
  matchedText?: string;
}

/**
 * Detects common prompt injection patterns
 */
export class InputSanitizer {
  /**
   * List of regex patterns that indicate prompt injection attempts
   *
   * BEGINNER NOTE: These patterns catch common attack vectors:
   * 1. "Ignore/disregard/forget previous instructions"
   * 2. "You are now..." (trying to redefine the agent's role)
   * 3. "New instructions" (trying to override system prompt)
   * 4. Special tokens like "system:" or ChatML tags
   */
  private readonly injectionPatterns: Array<{ pattern: RegExp; description: string }> = [
    {
      pattern: /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/i,
      description: 'Attempt to ignore previous instructions',
    },
    {
      pattern: /disregard\s+.*?instructions?/i,
      description: 'Attempt to disregard instructions',
    },
    {
      pattern: /forget\s+.*?instructions?/i,
      description: 'Attempt to forget instructions',
    },
    {
      pattern: /you\s+are\s+now\s+(a|an|the)/i,
      description: 'Attempt to redefine agent role',
    },
    {
      pattern: /new\s+instructions?:/i,
      description: 'Attempt to provide new instructions',
    },
    {
      pattern: /system\s*:\s*/i,
      description: 'System role injection attempt',
    },
    {
      pattern: /assistant\s*:\s*/i,
      description: 'Assistant role injection attempt',
    },
    {
      pattern: /<\|im_start\|>/i,
      description: 'ChatML tag injection (im_start)',
    },
    {
      pattern: /<\|im_end\|>/i,
      description: 'ChatML tag injection (im_end)',
    },
    {
      pattern: /\[INST\]/i,
      description: 'Llama instruction tag injection',
    },
    {
      pattern: /\[\/INST\]/i,
      description: 'Llama instruction end tag injection',
    },
  ];

  /**
   * Detects prompt injection patterns in user input
   *
   * BEGINNER NOTE: This method checks the input against all known
   * injection patterns. If any pattern matches, it returns details
   * about what was detected so you can log or block it.
   *
   * @param input - The user's message to validate
   * @returns Detection result with matched pattern details
   */
  detectInjection(input: string): InjectionDetectionResult {
    for (const { pattern, description } of this.injectionPatterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          detected: true,
          pattern: description,
          matchedText: match[0],
        };
      }
    }
    return { detected: false };
  }

  /**
   * Sanitize URLs in input (basic validation)
   *
   * BEGINNER NOTE: This prevents SSRF (Server-Side Request Forgery) attacks
   * where malicious URLs could access internal systems like:
   * - http://localhost (accessing local services)
   * - http://169.254.169.254 (AWS metadata endpoint)
   * - file:// (reading local files)
   */
  validateUrl(url: string): { valid: boolean; reason?: string } {
    try {
      const parsed = new URL(url);

      // Block local/private addresses
      const hostname = parsed.hostname.toLowerCase();

      // BEGINNER NOTE: These are reserved IP ranges that should never
      // be accessed from a public-facing service
      const blockedHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '169.254.169.254', // AWS metadata endpoint
        '::1', // IPv6 localhost
      ];

      if (blockedHosts.includes(hostname)) {
        return {
          valid: false,
          reason: `Blocked hostname: ${hostname}`,
        };
      }

      // Block file:// protocol
      if (parsed.protocol === 'file:') {
        return {
          valid: false,
          reason: 'File protocol not allowed',
        };
      }

      // Only allow http/https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return {
          valid: false,
          reason: `Protocol not allowed: ${parsed.protocol}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: 'Invalid URL format',
      };
    }
  }

  /**
   * Extract and validate all URLs in text
   *
   * BEGINNER NOTE: Finds all URLs in text using regex, then validates
   * each one. Useful for checking tool inputs that might contain URLs.
   */
  validateUrlsInText(text: string): { valid: boolean; invalidUrls: string[] } {
    // Simple URL extraction regex
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = text.match(urlRegex) || [];

    const invalidUrls: string[] = [];

    for (const url of urls) {
      const result = this.validateUrl(url);
      if (!result.valid) {
        invalidUrls.push(url);
      }
    }

    return {
      valid: invalidUrls.length === 0,
      invalidUrls,
    };
  }
}
