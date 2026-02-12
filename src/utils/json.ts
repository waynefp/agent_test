/**
 * JSON Utilities for Structured Outputs
 *
 * Utilities for extracting and validating JSON from Claude responses.
 *
 * BEGINNER NOTE: Claude sometimes wraps JSON in markdown code blocks (```json),
 * so we need smart extraction logic. We also use Zod for type-safe validation.
 *
 * Phase 17: Structured Outputs
 */

import { z } from 'zod';
import { logger } from './logger.js';

/**
 * Extract JSON from text that might be wrapped in markdown code blocks
 *
 * BEGINNER NOTE: Claude often returns JSON in ```json blocks. This function
 * handles both plain JSON and markdown-wrapped JSON.
 *
 * @param text - The text to extract JSON from
 * @returns Parsed JSON object
 * @throws {SyntaxError} If JSON cannot be parsed
 */
export function extractJSON(text: string): unknown {
  // Try to find JSON in markdown code block first
  // BEGINNER NOTE: Regex matches ```json or ``` followed by JSON content
  const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);

  if (codeBlockMatch) {
    logger.debug('[JSON] Extracted JSON from markdown code block');
    return JSON.parse(codeBlockMatch[1]);
  }

  // Try to parse the whole text as JSON
  // BEGINNER NOTE: If no code block, assume the entire text is JSON
  logger.debug('[JSON] Parsing text as plain JSON');
  return JSON.parse(text.trim());
}

/**
 * Validate JSON against a Zod schema
 *
 * BEGINNER NOTE: Zod parses AND validates in one step. It will:
 * - Check types (string, number, boolean, etc.)
 * - Validate constraints (email format, min/max, etc.)
 * - Throw ZodError with detailed error info if validation fails
 *
 * @param json - The JSON to validate
 * @param schema - Zod schema to validate against
 * @returns Typed and validated data
 * @throws {z.ZodError} If validation fails
 */
export function validateJSON<T>(json: unknown, schema: z.ZodSchema<T>): T {
  return schema.parse(json);
}

/**
 * Try to parse and validate structured output
 *
 * BEGINNER NOTE: This is the main function that combines extraction + validation.
 * It returns a discriminated union so you can handle success/failure cleanly.
 *
 * @param text - The raw text from Claude
 * @param schema - Zod schema to validate against
 * @returns Success with data OR failure with error details
 */
export function tryParseStructured<T>(
  text: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string; validationErrors?: z.ZodError } {
  try {
    // Step 1: Extract JSON from text (handles markdown wrapping)
    const json = extractJSON(text);

    // Step 2: Validate against schema
    const data = validateJSON(json, schema);

    return { success: true, data };
  } catch (error) {
    // Zod validation error - detailed info about what failed
    if (error instanceof z.ZodError) {
      logger.warn('[JSON] Validation failed:', error.errors);
      return {
        success: false,
        error: 'Output validation failed',
        validationErrors: error,
      };
    }

    // JSON parsing error - malformed JSON
    if (error instanceof SyntaxError) {
      logger.warn('[JSON] Invalid JSON syntax:', error.message);
      return {
        success: false,
        error: `Invalid JSON: ${error.message}`,
      };
    }

    // Unknown error
    logger.error('[JSON] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Format validation errors for display
 *
 * BEGINNER NOTE: Zod errors can be complex. This formats them into
 * a human-readable string for logging or display.
 *
 * @param error - Zod validation error
 * @returns Formatted error message
 */
export function formatValidationErrors(error: z.ZodError): string {
  return error.errors
    .map((err) => {
      const path = err.path.join('.');
      return `  - ${path || 'root'}: ${err.message}`;
    })
    .join('\n');
}
