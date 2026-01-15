/**
 * Agent Class
 *
 * The core agent that orchestrates conversations with Claude.
 * This is the "brain" that coordinates everything.
 *
 * BEGINNER NOTE: The Agent class is like a conductor in an orchestra -
 * it coordinates the ConversationManager (memory), Anthropic client (communication),
 * and eventually tools and tasks.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { ConversationManager, createConversationManager } from './ConversationManager.js';
import {
  getAnthropicClient,
  createMessageParams,
  DEFAULT_AGENT_CONFIG,
} from '../config/anthropic.config.js';
import type { AgentConfig, AgentResponse, ChatOptions, AgentState } from '../types/agent.types.js';
import type { Message } from '../types/conversation.types.js';
import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/errors.js';

/**
 * Agent class
 * BEGINNER NOTE: This is the main class you'll interact with to chat with Claude
 */
export class Agent {
  private client: Anthropic;
  private conversationManager: ConversationManager;
  private config: AgentConfig;
  private state: AgentState;

  /**
   * Create a new Agent
   * @param config - Optional configuration (uses defaults if not provided)
   */
  constructor(config?: Partial<AgentConfig>) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.client = getAnthropicClient();
    this.conversationManager = createConversationManager();

    // Initialize state
    this.state = {
      config: this.config,
      currentConversationId: this.conversationManager.getConversationId(),
      messageCount: 0,
      toolCallCount: 0,
      totalTokensUsed: 0,
      createdAt: new Date(),
    };

    logger.agent('Agent initialized', {
      model: this.config.model,
      conversationId: this.state.currentConversationId,
    });
  }

  /**
   * Send a message to Claude and get a response
   * BEGINNER NOTE: This is the main method you'll use - send a message, get a reply!
   *
   * @param userMessage - What the user wants to say
   * @param options - Optional chat options
   * @returns The assistant's response
   */
  async chat(userMessage: string, options?: ChatOptions): Promise<string> {
    try {
      const startTime = Date.now();

      // Add user message to conversation history
      logger.info(`User: ${userMessage}`);
      this.conversationManager.addTextMessage('user', userMessage);

      // Get conversation history in Anthropic format
      const messages = this.conversationManager.toAnthropicFormat();

      // Create the API request parameters
      const params = createMessageParams(messages, {
        ...this.config,
        systemPrompt: options?.systemPrompt || this.config.systemPrompt,
      });

      logger.agent('Sending request to Claude API...');

      // Call the Anthropic API
      const response = await this.client.messages.create(params);

      // Extract the text from the response
      // BEGINNER NOTE: Claude's response can have multiple content blocks,
      // but for now we're just getting the text
      const assistantMessage = this.extractTextFromResponse(response);

      // Add assistant's response to conversation history
      this.conversationManager.addTextMessage('assistant', assistantMessage);

      // Update state
      this.state.messageCount += 2; // user + assistant
      this.state.totalTokensUsed += response.usage.input_tokens + response.usage.output_tokens;
      this.state.lastActiveAt = new Date();

      // Log the response
      const responseTime = Date.now() - startTime;
      logger.success(`Assistant responded in ${responseTime}ms`);
      logger.info(`Tokens used: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);

      return assistantMessage;
    } catch (error) {
      logger.error('Failed to get response from Claude', error);
      throw new Error(`Chat failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Extract text from Anthropic's response
   * BEGINNER NOTE: Claude can return different types of content.
   * For now, we just extract the text.
   *
   * @param response - Response from Anthropic API
   * @returns The text content
   */
  private extractTextFromResponse(response: Anthropic.Message): string {
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    if (textBlocks.length === 0) {
      return '';
    }

    // Join all text blocks with newlines
    return textBlocks.map((block) => block.text).join('\n\n');
  }

  /**
   * Get the conversation history
   * BEGINNER NOTE: See everything that's been said so far
   */
  getConversationHistory(): Message[] {
    return this.conversationManager.getMessages();
  }

  /**
   * Get a summary of the conversation
   */
  getConversationSummary(): string {
    return this.conversationManager.getSummary();
  }

  /**
   * Clear the conversation history
   * BEGINNER NOTE: Start fresh - forget everything that's been said
   */
  clearConversation(): void {
    this.conversationManager.clearMessages();
    logger.info('Conversation cleared');
  }

  /**
   * Get the agent's current state
   * BEGINNER NOTE: See statistics about the agent's activity
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get the agent's configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update the agent's configuration
   * BEGINNER NOTE: Change settings like temperature, max tokens, etc.
   *
   * @param config - New configuration values
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
    this.state.config = this.config;
    logger.info('Agent configuration updated', config);
  }

  /**
   * Get statistics about token usage
   * BEGINNER NOTE: Tokens cost money, so it's good to track usage!
   */
  getTokenUsage(): {
    total: number;
    perMessage: number;
  } {
    return {
      total: this.state.totalTokensUsed,
      perMessage: this.state.messageCount > 0
        ? Math.round(this.state.totalTokensUsed / this.state.messageCount)
        : 0,
    };
  }

  /**
   * Get a simple text representation of the conversation
   * BEGINNER NOTE: Useful for displaying the conversation in the terminal
   */
  getConversationText(): string {
    const messages = this.conversationManager.getMessages();
    return messages
      .map((msg) => {
        const text = msg.content
          .filter((block) => block.type === 'text')
          .map((block) => (block as any).text)
          .join('\n');

        const role = msg.role === 'user' ? 'You' : 'Assistant';
        return `${role}: ${text}`;
      })
      .join('\n\n');
  }
}

/**
 * Factory function to create a new Agent
 * BEGINNER NOTE: Use this to create your agent:
 * const agent = createAgent({ temperature: 0.7 });
 *
 * @param config - Optional configuration
 * @returns A new Agent instance
 */
export function createAgent(config?: Partial<AgentConfig>): Agent {
  return new Agent(config);
}
