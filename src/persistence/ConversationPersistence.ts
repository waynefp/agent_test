/**
 * Conversation Persistence
 *
 * Handles saving and loading conversations to/from disk.
 * This allows users to resume conversations later.
 *
 * BEGINNER NOTE: Persistence means "saving data so it survives after
 * the program closes." Without persistence, all conversations are lost
 * when you exit the chat.
 *
 * Phase 9: Persistence
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { Conversation, Message } from '../types/conversation.types.js';
import { logger } from '../utils/logger.js';

/**
 * Metadata about a saved conversation (for listing)
 */
export interface ConversationMetadata {
  id: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  previewText: string;
}

/**
 * Options for saving a conversation
 */
export interface SaveOptions {
  /** Custom title for the conversation */
  title?: string;
  /** Overwrite if exists (default: true) */
  overwrite?: boolean;
}

/**
 * Result of a save operation
 */
export interface SaveResult {
  success: boolean;
  filePath: string;
  error?: string;
}

/**
 * Result of a load operation
 */
export interface LoadResult {
  success: boolean;
  conversation?: Conversation;
  error?: string;
}

/**
 * Conversation Persistence Manager
 * BEGINNER NOTE: This class handles all file operations for conversations
 */
export class ConversationPersistence {
  private dataDir: string;

  /**
   * Create a new ConversationPersistence instance
   * @param dataDir - Directory to store conversation files
   */
  constructor(dataDir: string = './data/conversations') {
    this.dataDir = dataDir;
  }

  /**
   * Ensure the data directory exists
   * BEGINNER NOTE: We need to create the directory before saving files
   */
  private async ensureDataDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get the file path for a conversation
   * @param conversationId - The conversation ID
   */
  private getFilePath(conversationId: string): string {
    // Sanitize the ID to prevent path traversal attacks
    const sanitizedId = conversationId.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.dataDir, `${sanitizedId}.json`);
  }

  /**
   * Save a conversation to disk
   * BEGINNER NOTE: Converts the conversation to JSON and writes to a file
   *
   * @param conversation - The conversation to save
   * @param options - Save options
   * @returns Result of the save operation
   */
  async save(conversation: Conversation, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      await this.ensureDataDir();

      const filePath = this.getFilePath(conversation.id);

      // Check if file exists and overwrite is disabled
      if (!options.overwrite) {
        try {
          await fs.access(filePath);
          return {
            success: false,
            filePath,
            error: 'Conversation already exists. Use overwrite option to replace.',
          };
        } catch {
          // File doesn't exist, we can proceed
        }
      }

      // Update title if provided
      const conversationToSave: Conversation = {
        ...conversation,
        title: options.title || conversation.title || this.generateTitle(conversation),
        updatedAt: new Date(),
      };

      // Convert to JSON with proper date handling
      const json = JSON.stringify(conversationToSave, null, 2);

      // Write to file
      await fs.writeFile(filePath, json, 'utf-8');

      logger.success(`Conversation saved: ${filePath}`);

      return {
        success: true,
        filePath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to save conversation:', error);

      return {
        success: false,
        filePath: this.getFilePath(conversation.id),
        error: errorMessage,
      };
    }
  }

  /**
   * Load a conversation from disk
   * BEGINNER NOTE: Reads the JSON file and converts it back to a conversation object
   *
   * @param conversationId - The ID of the conversation to load
   * @returns Result of the load operation
   */
  async load(conversationId: string): Promise<LoadResult> {
    try {
      const filePath = this.getFilePath(conversationId);

      // Read the file
      const json = await fs.readFile(filePath, 'utf-8');

      // Parse JSON and restore Date objects
      const data = JSON.parse(json);
      const conversation = this.restoreDates(data);

      logger.success(`Conversation loaded: ${conversationId}`);

      return {
        success: true,
        conversation,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: false,
          error: `Conversation not found: ${conversationId}`,
        };
      }

      logger.error('Failed to load conversation:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete a saved conversation
   *
   * @param conversationId - The ID of the conversation to delete
   * @returns true if deleted, false if not found
   */
  async delete(conversationId: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(conversationId);
      await fs.unlink(filePath);
      logger.success(`Conversation deleted: ${conversationId}`);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * List all saved conversations
   * BEGINNER NOTE: Scans the directory for conversation files and returns metadata
   *
   * @returns Array of conversation metadata
   */
  async list(): Promise<ConversationMetadata[]> {
    try {
      await this.ensureDataDir();

      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const conversations: ConversationMetadata[] = [];

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.dataDir, file);
          const json = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(json);

          conversations.push({
            id: data.id,
            title: data.title || 'Untitled',
            messageCount: data.messages?.length || 0,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
            previewText: this.getPreviewText(data.messages),
          });
        } catch {
          // Skip invalid files
          logger.warn(`Skipping invalid conversation file: ${file}`);
        }
      }

      // Sort by updatedAt, most recent first
      conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      return conversations;
    } catch (error) {
      logger.error('Failed to list conversations:', error);
      return [];
    }
  }

  /**
   * Check if a conversation exists
   *
   * @param conversationId - The ID to check
   * @returns true if exists
   */
  async exists(conversationId: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(conversationId);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a title from conversation content
   * BEGINNER NOTE: Creates a title from the first user message
   */
  private generateTitle(conversation: Conversation): string {
    const firstUserMessage = conversation.messages.find(m => m.role === 'user');

    if (!firstUserMessage) {
      return 'New Conversation';
    }

    // Get text content from first message
    const textContent = firstUserMessage.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return 'New Conversation';
    }

    // Truncate to first 50 characters
    const text = (textContent as any).text || '';
    const truncated = text.slice(0, 50);

    return truncated.length < text.length ? `${truncated}...` : truncated;
  }

  /**
   * Get preview text from messages
   */
  private getPreviewText(messages: Message[]): string {
    if (!messages || messages.length === 0) {
      return '(empty conversation)';
    }

    const lastMessage = messages[messages.length - 1];
    const textContent = lastMessage.content.find(c => c.type === 'text');

    if (!textContent || textContent.type !== 'text') {
      return '(no text content)';
    }

    const text = (textContent as any).text || '';
    const truncated = text.slice(0, 80);

    return truncated.length < text.length ? `${truncated}...` : truncated;
  }

  /**
   * Restore Date objects from JSON
   * BEGINNER NOTE: JSON doesn't have a Date type, so dates are saved as strings.
   * We need to convert them back to Date objects when loading.
   */
  private restoreDates(data: any): Conversation {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      messages: data.messages.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      })),
    };
  }
}

/**
 * Factory function
 */
export function createConversationPersistence(dataDir?: string): ConversationPersistence {
  return new ConversationPersistence(dataDir);
}
