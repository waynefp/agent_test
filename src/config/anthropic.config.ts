/**
 * Anthropic SDK Configuration
 *
 * This file sets up the Anthropic SDK client for talking to Claude.
 *
 * BEGINNER NOTE: The Anthropic client is like a "phone line" to Claude.
 * You use it to send messages and receive responses.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL,
  MAX_TOKENS,
  THINKING_ENABLED,
  THINKING_BUDGET_TOKENS,
} from './environment.js';
import type { AgentConfig } from '../types/agent.types.js';

/**
 * Create a new Anthropic client instance
 * BEGINNER NOTE: This creates the connection to the Anthropic API
 */
export function createAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });
}

/**
 * Get the current date formatted for the system prompt
 * BEGINNER NOTE: This ensures the agent always knows today's date
 */
function getCurrentDateString(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate the default system prompt with current date
 * BEGINNER NOTE: Including the date helps the agent search for current information
 */
function getDefaultSystemPrompt(): string {
  return `You are a helpful AI assistant. You are friendly, concise, and knowledgeable.

Today's date is ${getCurrentDateString()}. When searching for current information, use this date to find the most recent and relevant results.`;
}

/**
 * Default configuration for the agent
 * BEGINNER NOTE: These are sensible defaults you can override when creating an agent
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  model: ANTHROPIC_MODEL,
  maxTokens: MAX_TOKENS,
  temperature: 1.0, // 0.0 = deterministic, 1.0 = creative
  enableTools: false, // Will enable in Phase 4
  enableTaskTracking: false, // Will enable in Phase 5
  systemPrompt: getDefaultSystemPrompt(),

  // Extended Thinking (Phase 16)
  // BEGINNER NOTE: Off by default to save costs and latency
  thinkingEnabled: THINKING_ENABLED,
  thinkingBudgetTokens: THINKING_BUDGET_TOKENS,
};

/**
 * Singleton instance of the Anthropic client
 * BEGINNER NOTE: A singleton means we create one client and reuse it everywhere.
 * Creating multiple clients wastes resources.
 */
let clientInstance: Anthropic | null = null;

/**
 * Get the Anthropic client (creates it if it doesn't exist)
 * BEGINNER NOTE: This ensures we only create the client once
 */
export function getAnthropicClient(): Anthropic {
  if (!clientInstance) {
    clientInstance = createAnthropicClient();
  }
  return clientInstance;
}

/**
 * Helper function to validate a model name
 * BEGINNER NOTE: Makes sure you're using a valid Claude model
 */
export function isValidModel(model: string): boolean {
  const validModels = [
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250929',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
  ];
  return validModels.includes(model);
}

/**
 * Helper to create a message request with default parameters
 * BEGINNER NOTE: This packages up all the info Claude needs to respond
 */
export function createMessageParams(
  messages: Anthropic.MessageParam[],
  config?: Partial<AgentConfig>
): Anthropic.MessageCreateParams {
  const finalConfig = { ...DEFAULT_AGENT_CONFIG, ...config };

  const params: Anthropic.MessageCreateParams = {
    model: finalConfig.model,
    max_tokens: finalConfig.maxTokens,
    messages,
  };

  // Add optional parameters if provided
  if (finalConfig.systemPrompt) {
    params.system = finalConfig.systemPrompt;
  }

  if (finalConfig.temperature !== undefined) {
    params.temperature = finalConfig.temperature;
  }

  // Add extended thinking if enabled (Phase 16)
  // BEGINNER NOTE: This tells Claude to show its step-by-step reasoning
  // before providing a final answer. The budget controls how many tokens
  // Claude can use for thinking.
  if (finalConfig.thinkingEnabled) {
    params.thinking = {
      type: 'enabled',
      budget_tokens: finalConfig.thinkingBudgetTokens || 10000,
    };
  }

  // Add structured output support (Phase 17)
  // BEGINNER NOTE: This tells Claude to return JSON instead of plain text.
  // We also enhance the system prompt to remind Claude about the JSON requirement.
  if (finalConfig.outputSchema) {
    // Type assertion needed - response_format not yet in SDK types
    (params as any).response_format = { type: 'json_object' };

    // Enhance system prompt with JSON instruction
    const schemaHint =
      '\n\nYou must respond with valid JSON matching the provided schema. Do not include any text outside the JSON object.';

    if (params.system) {
      params.system =
        typeof params.system === 'string'
          ? params.system + schemaHint
          : params.system; // Handle array format if needed
    } else {
      params.system = schemaHint;
    }
  }

  return params;
}

/**
 * Export commonly used types from Anthropic SDK
 * BEGINNER NOTE: Re-exporting makes these types easier to import elsewhere
 */
export type { Anthropic };
export type AnthropicMessage = Anthropic.Message;
export type AnthropicMessageParam = Anthropic.MessageParam;
export type AnthropicContentBlock = Anthropic.ContentBlock;
export type AnthropicTextBlock = Anthropic.TextBlock;
