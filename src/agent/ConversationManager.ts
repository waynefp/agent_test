/**
 * Conversation Manager
 *
 * Manages conversation history - storing messages, retrieving history,
 * and converting between our format and Anthropic's API format.
 *
 * BEGINNER NOTE: Think of this as the agent's "memory" - it remembers
 * everything that's been said in the conversation.
 */

import { randomUUID } from 'crypto';
import type {
  Message,
  MessageContent,
  MessageRole,
  Conversation,
  ConversationOptions,
  TextContent,
} from '../types/conversation.types.js';
import type { AnthropicMessageParam } from '../config/anthropic.config.js';
import { logger } from '../utils/logger.js';

/**
 * ConversationManager class
 * BEGINNER NOTE: This class handles all conversation-related operations
 */
export class ConversationManager {
  private conversation: Conversation;

  /**
   * Create a new ConversationManager
   * @param options - Optional configuration
   */
  constructor(options?: ConversationOptions) {
    this.conversation = {
      id: options?.id || randomUUID(),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      title: options?.title,
      metadata: options?.metadata || {},
    };

    logger.debug(`Created new conversation: ${this.conversation.id}`);
  }

  /**
   * Add a message to the conversation
   * BEGINNER NOTE: Call this every time the user or assistant says something
   *
   * @param role - Who is speaking ('user' or 'assistant')
   * @param content - What they said (can be text or other content types)
   */
  addMessage(role: MessageRole, content: MessageContent[]): Message {
    const message: Message = {
      role,
      content,
      timestamp: new Date(),
      id: randomUUID(),
    };

    this.conversation.messages.push(message);
    this.conversation.updatedAt = new Date();

    // Update metadata
    if (!this.conversation.metadata) {
      this.conversation.metadata = {};
    }
    this.conversation.metadata.messageCount = this.conversation.messages.length;

    logger.debug(`Added ${role} message to conversation ${this.conversation.id}`);

    return message;
  }

  /**
   * Add a simple text message (convenience method)
   * BEGINNER NOTE: Use this when you just have text (most common case)
   *
   * @param role - Who is speaking
   * @param text - What they said
   */
  addTextMessage(role: MessageRole, text: string): Message {
    const content: TextContent = {
      type: 'text',
      text,
    };

    return this.addMessage(role, [content]);
  }

  /**
   * Add a message from an Anthropic API response
   * BEGINNER NOTE: Use this to add Claude's responses directly
   * Handles text, tool_use, and other content types
   *
   * @param response - The response from Anthropic API
   */
  addAssistantResponse(response: any): Message {
    // Convert Anthropic content blocks to our format
    const content: MessageContent[] = response.content.map((block: any) => {
      if (block.type === 'text') {
        return {
          type: 'text',
          text: block.text,
        };
      } else if (block.type === 'tool_use') {
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        };
      }
      // Pass through other types as-is
      return block;
    });

    return this.addMessage('assistant', content);
  }

  /**
   * Add a tool result message
   * BEGINNER NOTE: Use this after executing a tool to send the result back
   *
   * @param toolUseId - The ID from the tool_use block
   * @param result - The result from the tool
   * @param isError - Whether this is an error result
   */
  addToolResult(toolUseId: string, result: string, isError: boolean = false): Message {
    const content: MessageContent = {
      type: 'tool_result',
      tool_use_id: toolUseId,
      content: result,
      is_error: isError,
    };

    return this.addMessage('user', [content]);
  }

  /**
   * Get all messages in the conversation
   * BEGINNER NOTE: Returns a copy so you can't accidentally modify the original
   */
  getMessages(): Message[] {
    return [...this.conversation.messages];
  }

  /**
   * Get the last N messages
   * BEGINNER NOTE: Useful for limiting context window size
   *
   * @param count - How many recent messages to get
   */
  getRecentMessages(count: number): Message[] {
    return this.conversation.messages.slice(-count);
  }

  /**
   * Get the conversation ID
   */
  getConversationId(): string {
    return this.conversation.id;
  }

  /**
   * Get the full conversation object
   */
  getConversation(): Conversation {
    return { ...this.conversation };
  }

  /**
   * Clear all messages from the conversation
   * BEGINNER NOTE: Use this to start fresh without creating a new manager
   */
  clearMessages(): void {
    this.conversation.messages = [];
    this.conversation.updatedAt = new Date();

    if (this.conversation.metadata) {
      this.conversation.metadata.messageCount = 0;
    }

    logger.info(`Cleared all messages from conversation ${this.conversation.id}`);
  }

  /**
   * Replace all messages with a new set
   * BEGINNER NOTE: Used by context management when trimming old messages
   *
   * @param messages - New messages to use
   */
  setMessages(messages: Message[]): void {
    this.conversation.messages = messages;
    this.conversation.updatedAt = new Date();

    if (this.conversation.metadata) {
      this.conversation.metadata.messageCount = messages.length;
    }

    logger.debug(`Replaced messages in conversation ${this.conversation.id}, now ${messages.length} messages`);
  }

  /**
   * Prepend a system context message
   * BEGINNER NOTE: Used to add summarized context from trimmed messages
   *
   * @param text - The context/summary text to prepend
   */
  prependContext(text: string): void {
    const contextMessage: Message = {
      role: 'user',
      content: [{ type: 'text', text }],
      timestamp: new Date(),
      id: randomUUID(),
    };

    // Insert at the beginning
    this.conversation.messages.unshift(contextMessage);
    this.conversation.updatedAt = new Date();

    if (this.conversation.metadata) {
      this.conversation.metadata.messageCount = this.conversation.messages.length;
    }

    logger.debug('Prepended context message to conversation');
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.conversation.messages.length;
  }

  /**
   * Convert our messages to Anthropic API format
   * BEGINNER NOTE: Claude's API expects a specific format - this converts our messages to that
   *
   * @param messages - Messages to convert (defaults to all conversation messages)
   * @returns Messages in Anthropic API format
   */
  toAnthropicFormat(messages?: Message[]): AnthropicMessageParam[] {
    const messagesToConvert = messages || this.conversation.messages;

    return messagesToConvert.map((message) => ({
      role: message.role,
      content: message.content.map((block) => {
        // For now, we only handle text content
        // In Phase 4, we'll add tool_use and tool_result
        if (block.type === 'text') {
          return {
            type: 'text',
            text: block.text,
          };
        }

        // For other types, just pass through
        // This will be expanded in Phase 4 for tools
        return block as any;
      }),
    }));
  }

  /**
   * Get conversation summary
   * BEGINNER NOTE: Useful for debugging - shows you what's in the conversation
   */
  getSummary(): string {
    const messageCount = this.conversation.messages.length;
    const userMessages = this.conversation.messages.filter(
      (m) => m.role === 'user'
    ).length;
    const assistantMessages = messageCount - userMessages;

    return (
      `Conversation ${this.conversation.id}\n` +
      `  Created: ${this.conversation.createdAt.toLocaleString()}\n` +
      `  Updated: ${this.conversation.updatedAt.toLocaleString()}\n` +
      `  Messages: ${messageCount} (${userMessages} user, ${assistantMessages} assistant)\n` +
      `  Title: ${this.conversation.title || 'Untitled'}`
    );
  }

  /**
   * Set conversation title
   * BEGINNER NOTE: Give your conversation a memorable name
   */
  setTitle(title: string): void {
    this.conversation.title = title;
    this.conversation.updatedAt = new Date();
  }

  /**
   * Update conversation metadata
   * BEGINNER NOTE: Store extra information about the conversation
   */
  updateMetadata(metadata: Record<string, unknown>): void {
    this.conversation.metadata = {
      ...this.conversation.metadata,
      ...metadata,
    };
    this.conversation.updatedAt = new Date();
  }
}

/**
 * Factory function to create a new ConversationManager
 * BEGINNER NOTE: Use this instead of 'new ConversationManager()' - it's cleaner
 */
export function createConversationManager(
  options?: ConversationOptions
): ConversationManager {
  return new ConversationManager(options);
}
