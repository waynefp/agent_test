/**
 * Guardrails & Validation Exports (Phase 18)
 *
 * BEGINNER NOTE: This barrel file re-exports all guardrails components
 * so you can import them in one line:
 *
 * import { GuardrailsValidator, InputSanitizer } from '../guardrails/index.js';
 *
 * Instead of:
 * import { GuardrailsValidator } from '../guardrails/Validator.js';
 * import { InputSanitizer } from '../guardrails/InputSanitizer.js';
 */

export { GuardrailsValidator } from './Validator.js';
export { InputSanitizer } from './InputSanitizer.js';
export { ContentFilter } from './ContentFilter.js';
export { RateLimiter } from './RateLimiter.js';
export { TokenQuota } from './TokenQuota.js';

export type {
  GuardrailsConfig,
  GuardrailsResult,
  GuardrailViolation,
  AuditLogEntry,
  ValidationContext,
  ValidationFunction,
} from '../types/guardrails.types.js';
