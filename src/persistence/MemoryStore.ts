/**
 * Memory Store - Long-term Memory Persistence
 *
 * Stores facts and information that persist across conversations.
 * This is different from conversation history - it's for remembering
 * things ABOUT the user or important facts.
 *
 * BEGINNER NOTE: Think of this as the agent's "notebook" where it
 * writes down important things to remember later. Conversation history
 * is like short-term memory; this is like long-term memory.
 *
 * Phase 10: Memory & Web Search
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * A single memory entry
 */
export interface MemoryEntry {
  /** Unique identifier */
  id: string;

  /** Category for organization (e.g., "preferences", "facts", "personal") */
  category: string;

  /** The key/topic of the memory */
  key: string;

  /** The actual content/fact to remember */
  content: string;

  /** When this was first stored */
  createdAt: Date;

  /** When this was last updated */
  updatedAt: Date;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a memory search
 */
export interface MemorySearchResult {
  entries: MemoryEntry[];
  totalCount: number;
}

/**
 * Memory Store - Persists long-term memories
 */
export class MemoryStore {
  private memories: Map<string, MemoryEntry> = new Map();
  private dataPath: string;
  private loaded: boolean = false;

  constructor(dataPath: string = './data/memory/memories.json') {
    this.dataPath = dataPath;
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDataDir(): Promise<void> {
    const dir = path.dirname(this.dataPath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Load memories from disk
   */
  async load(): Promise<void> {
    try {
      await this.ensureDataDir();
      const json = await fs.readFile(this.dataPath, 'utf-8');
      const data = JSON.parse(json);

      this.memories.clear();
      for (const entry of data.memories || []) {
        const restored: MemoryEntry = {
          ...entry,
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt),
        };
        this.memories.set(restored.id, restored);
      }

      this.loaded = true;
      logger.debug(`Loaded ${this.memories.size} memories`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist yet, start fresh
        this.memories.clear();
        this.loaded = true;
        logger.debug('No existing memories found, starting fresh');
      } else {
        throw error;
      }
    }
  }

  /**
   * Save memories to disk
   */
  async save(): Promise<void> {
    await this.ensureDataDir();

    const data = {
      version: 1,
      savedAt: new Date().toISOString(),
      memories: Array.from(this.memories.values()),
    };

    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
    logger.debug(`Saved ${this.memories.size} memories`);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store a new memory or update existing
   * BEGINNER NOTE: If a memory with the same category+key exists, it updates it
   *
   * @param category - Category for organization
   * @param key - The topic/key of the memory
   * @param content - What to remember
   * @param metadata - Optional extra data
   * @returns The created/updated memory entry
   */
  async store(
    category: string,
    key: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryEntry> {
    if (!this.loaded) await this.load();

    // Check if memory with same category+key exists
    const existing = this.findByKey(category, key);

    if (existing) {
      // Update existing memory
      existing.content = content;
      existing.updatedAt = new Date();
      if (metadata) {
        existing.metadata = { ...existing.metadata, ...metadata };
      }
      await this.save();
      logger.info(`Updated memory: [${category}] ${key}`);
      return existing;
    }

    // Create new memory
    const entry: MemoryEntry = {
      id: this.generateId(),
      category: category.toLowerCase(),
      key: key.toLowerCase(),
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };

    this.memories.set(entry.id, entry);
    await this.save();
    logger.info(`Stored new memory: [${category}] ${key}`);
    return entry;
  }

  /**
   * Find a memory by category and key
   */
  findByKey(category: string, key: string): MemoryEntry | undefined {
    const lowerCategory = category.toLowerCase();
    const lowerKey = key.toLowerCase();

    for (const entry of this.memories.values()) {
      if (entry.category === lowerCategory && entry.key === lowerKey) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Recall a specific memory
   *
   * @param category - Category to search in
   * @param key - Key to find
   * @returns The memory content, or undefined if not found
   */
  async recall(category: string, key: string): Promise<string | undefined> {
    if (!this.loaded) await this.load();

    const entry = this.findByKey(category, key);
    return entry?.content;
  }

  /**
   * Search memories by text
   * BEGINNER NOTE: Searches in keys and content
   *
   * @param query - Text to search for
   * @param category - Optional category filter
   * @returns Matching memories
   */
  async search(query: string, category?: string): Promise<MemorySearchResult> {
    if (!this.loaded) await this.load();

    const lowerQuery = query.toLowerCase();
    const lowerCategory = category?.toLowerCase();

    const matches: MemoryEntry[] = [];

    for (const entry of this.memories.values()) {
      // Filter by category if provided
      if (lowerCategory && entry.category !== lowerCategory) {
        continue;
      }

      // Search in key and content
      if (
        entry.key.toLowerCase().includes(lowerQuery) ||
        entry.content.toLowerCase().includes(lowerQuery)
      ) {
        matches.push(entry);
      }
    }

    // Sort by most recently updated
    matches.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return {
      entries: matches,
      totalCount: matches.length,
    };
  }

  /**
   * Get all memories in a category
   *
   * @param category - Category to list
   * @returns All memories in that category
   */
  async listByCategory(category: string): Promise<MemoryEntry[]> {
    if (!this.loaded) await this.load();

    const lowerCategory = category.toLowerCase();
    const matches: MemoryEntry[] = [];

    for (const entry of this.memories.values()) {
      if (entry.category === lowerCategory) {
        matches.push(entry);
      }
    }

    // Sort by key alphabetically
    matches.sort((a, b) => a.key.localeCompare(b.key));

    return matches;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    if (!this.loaded) await this.load();

    const categories = new Set<string>();
    for (const entry of this.memories.values()) {
      categories.add(entry.category);
    }

    return Array.from(categories).sort();
  }

  /**
   * Delete a memory by ID
   *
   * @param id - Memory ID to delete
   * @returns true if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    if (!this.loaded) await this.load();

    const deleted = this.memories.delete(id);
    if (deleted) {
      await this.save();
      logger.info(`Deleted memory: ${id}`);
    }
    return deleted;
  }

  /**
   * Delete a memory by category and key
   *
   * @param category - Category
   * @param key - Key
   * @returns true if deleted, false if not found
   */
  async deleteByKey(category: string, key: string): Promise<boolean> {
    if (!this.loaded) await this.load();

    const entry = this.findByKey(category, key);
    if (entry) {
      return this.delete(entry.id);
    }
    return false;
  }

  /**
   * Get total memory count
   */
  async getCount(): Promise<number> {
    if (!this.loaded) await this.load();
    return this.memories.size;
  }

  /**
   * Get all memories (for display/export)
   */
  async getAll(): Promise<MemoryEntry[]> {
    if (!this.loaded) await this.load();
    return Array.from(this.memories.values());
  }

  /**
   * Clear all memories
   * BEGINNER NOTE: Use with caution!
   */
  async clear(): Promise<void> {
    this.memories.clear();
    await this.save();
    logger.warn('All memories cleared');
  }
}

/**
 * Factory function
 */
export function createMemoryStore(dataPath?: string): MemoryStore {
  return new MemoryStore(dataPath);
}
