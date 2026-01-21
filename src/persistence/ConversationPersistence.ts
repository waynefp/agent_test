/**
 * Conversation Persistence
 *
 * Handles saving and loading conversations to/from JSON files.
 *
 * BEGINNER NOTE: This is how conversations survive when you close the app.
 * Each conversation is saved as a separate JSON file in the data/conversations/ directory.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from 'fs';
import { join, extname } from 'path';
import type {
  Conversation,
  Message,
  MessageContent,
  ConversationMetadata,
} from '../types/conversation.types.js';
import { logger } from '../utils/logger.js';

/**
 * Interface for the persisted conversation data
 * BEGINNER NOTE: This is the structure of the JSON file
 */
interface PersistedConversationData {
  /** Version for future migrations */
  version: number;

  /** Conversation data */
  conversation: PersistedConversation;
}

/**
 * Conversation with dates as strings (for JSON serialization)
 * BEGINNER NOTE: JSON doesn't support Date objects, so we convert to strings
 */
interface PersistedConversation {
  id: string;
  messages: PersistedMessage[];
  createdAt: string;
  updatedAt: string;
  title?: string;
  metadata?: ConversationMetadata;
}

/**
 * Message with dates as strings
 */
interface PersistedMessage {
  role: Message['role'];
  content: MessageContent[];
  timestamp: string;
  id?: string;
  metadata?: Message['metadata'];
}

/**
 * Conversation summary for listing
 */
export interface ConversationSummary {
  id: string;
  title?: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  filePath: string;
}

/**
 * ConversationPersistence class
 * BEGINNER NOTE: Handles all file I/O for conversations
 */
export class ConversationPersistence {
  private conversationsDir: string;

  /**
   * Create a new ConversationPersistence
   * @param dataDir - Base data directory (defaults to ./data)
   */
  constructor(dataDir: string = './data') {
    this.conversationsDir = join(dataDir, 'conversations');
    this.ensureDirectoriesExist();
  }

  /**
   * Ensure the data directories exist
   * BEGINNER NOTE: Creates directories if they don't exist
   */
  private ensureDirectoriesExist(): void {
    if (!existsSync(this.conversationsDir)) {
      mkdirSync(this.conversationsDir, { recursive: true });
      logger.info(`Created conversations directory: ${this.conversationsDir}`);
    }
  }

  /**
   * Get the file path for a conversation
   * @param conversationId - ID of the conversation
   */
  private getFilePath(conversationId: string): string {
    return join(this.conversationsDir, `${conversationId}.json`);
  }

  /**
   * Save a conversation to disk
   * BEGINNER NOTE: Converts Date objects to strings and writes to JSON file
   *
   * @param conversation - Conversation to save
   */
  async save(conversation: Conversation): Promise<void> {
    const persistedConversation = this.conversationToPersistedConversation(conversation);

    const data: PersistedConversationData = {
      version: 1,
      conversation: persistedConversation,
    };

    const filePath = this.getFilePath(conversation.id);

    // Write to file
    try {
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug(
        `Saved conversation ${conversation.id} (${conversation.messages.length} messages) to ${filePath}`
      );
    } catch (error) {
      logger.error('Failed to save conversation:', error);
      throw error;
    }
  }

  /**
   * Load a conversation from disk
   * BEGINNER NOTE: Reads JSON file and converts back to Conversation
   *
   * @param conversationId - ID of the conversation to load
   * @returns Conversation object
   */
  async load(conversationId: string): Promise<Conversation> {
    const filePath = this.getFilePath(conversationId);

    if (!existsSync(filePath)) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const data: PersistedConversationData = JSON.parse(content);

      // Validate version
      if (data.version !== 1) {
        logger.warn(`Unknown conversation file version: ${data.version}`);
      }

      // Convert back to Conversation with proper Date objects
      const conversation = this.persistedConversationToConversation(data.conversation);

      logger.debug(
        `Loaded conversation ${conversationId} (${conversation.messages.length} messages) from ${filePath}`
      );

      return conversation;
    } catch (error) {
      logger.error('Failed to load conversation:', error);
      throw error;
    }
  }

  /**
   * List all saved conversations
   * BEGINNER NOTE: Returns summaries of all conversations without loading full content
   *
   * @returns Array of conversation summaries sorted by update time (newest first)
   */
  async list(): Promise<ConversationSummary[]> {
    if (!existsSync(this.conversationsDir)) {
      return [];
    }

    try {
      const files = readdirSync(this.conversationsDir);
      const summaries: ConversationSummary[] = [];

      for (const file of files) {
        // Only process .json files
        if (extname(file) !== '.json') {
          continue;
        }

        const filePath = join(this.conversationsDir, file);

        try {
          const content = readFileSync(filePath, 'utf-8');
          const data: PersistedConversationData = JSON.parse(content);
          const conv = data.conversation;

          summaries.push({
            id: conv.id,
            title: conv.title,
            messageCount: conv.messages.length,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
            filePath,
          });
        } catch (error) {
          logger.warn(`Failed to read conversation file ${file}:`, error);
        }
      }

      // Sort by updated date, newest first
      summaries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      logger.debug(`Listed ${summaries.length} conversation(s)`);
      return summaries;
    } catch (error) {
      logger.error('Failed to list conversations:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   * BEGINNER NOTE: Permanently deletes the conversation file
   *
   * @param conversationId - ID of the conversation to delete
   */
  async delete(conversationId: string): Promise<void> {
    const filePath = this.getFilePath(conversationId);

    if (!existsSync(filePath)) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    try {
      unlinkSync(filePath);
      logger.info(`Deleted conversation ${conversationId}`);
    } catch (error) {
      logger.error('Failed to delete conversation:', error);
      throw error;
    }
  }

  /**
   * Check if a conversation exists
   * @param conversationId - ID of the conversation
   */
  exists(conversationId: string): boolean {
    return existsSync(this.getFilePath(conversationId));
  }

  /**
   * Get the directory path
   */
  getDirectoryPath(): string {
    return this.conversationsDir;
  }

  /**
   * Convert a Conversation to PersistedConversation (for JSON serialization)
   * BEGINNER NOTE: Converts Date objects to ISO strings
   */
  private conversationToPersistedConversation(
    conversation: Conversation
  ): PersistedConversation {
    return {
      id: conversation.id,
      messages: conversation.messages.map((msg) => this.messageToPersistedMessage(msg)),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      title: conversation.title,
      metadata: conversation.metadata,
    };
  }

  /**
   * Convert a PersistedConversation back to Conversation
   * BEGINNER NOTE: Converts ISO strings back to Date objects
   */
  private persistedConversationToConversation(
    persisted: PersistedConversation
  ): Conversation {
    return {
      id: persisted.id,
      messages: persisted.messages.map((msg) => this.persistedMessageToMessage(msg)),
      createdAt: new Date(persisted.createdAt),
      updatedAt: new Date(persisted.updatedAt),
      title: persisted.title,
      metadata: persisted.metadata,
    };
  }

  /**
   * Convert a Message to PersistedMessage
   */
  private messageToPersistedMessage(message: Message): PersistedMessage {
    return {
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      id: message.id,
      metadata: message.metadata,
    };
  }

  /**
   * Convert a PersistedMessage back to Message
   */
  private persistedMessageToMessage(persisted: PersistedMessage): Message {
    return {
      role: persisted.role,
      content: persisted.content,
      timestamp: new Date(persisted.timestamp),
      id: persisted.id,
      metadata: persisted.metadata,
    };
  }
}

/**
 * Factory function to create a ConversationPersistence
 * @param dataDir - Base data directory
 */
export function createConversationPersistence(dataDir?: string): ConversationPersistence {
  return new ConversationPersistence(dataDir);
}
