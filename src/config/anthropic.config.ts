/**
 * Anthropic SDK Configuration
 *
 * This file sets up the Anthropic SDK client for talking to Claude.
 *
 * BEGINNER NOTE: The Anthropic client is like a "phone line" to Claude.
 * You use it to send messages and receive responses.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY, ANTHROPIC_MODEL, MAX_TOKENS } from './environment.js';
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
 * Default configuration for the agent
 * BEGINNER NOTE: These are sensible defaults you can override when creating an agent
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  model: ANTHROPIC_MODEL,
  maxTokens: MAX_TOKENS,
  temperature: 1.0, // 0.0 = deterministic, 1.0 = creative
  enableTools: false, // Will enable in Phase 4
  enableTaskTracking: false, // Will enable in Phase 5
  systemPrompt: `You are a helpful AI assistant. You are friendly, concise, and knowledgeable.`,
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
