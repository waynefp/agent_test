/**
 * Memory Tool
 *
 * Allows the agent to store and recall long-term memories.
 * This is useful for remembering facts about the user, preferences,
 * or important information across conversations.
 *
 * BEGINNER NOTE: This tool gives the agent a "notebook" to write down
 * and look up things it should remember. Unlike conversation history
 * (which is temporary), memories persist forever until deleted.
 *
 * Phase 10: Memory & Web Search
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';
import { MemoryStore, createMemoryStore } from '../../persistence/MemoryStore.js';

/**
 * Input schema for the memory tool
 */
const MemoryInputSchema = z.object({
  operation: z.enum(['store', 'recall', 'search', 'list', 'delete']).describe(
    'The operation to perform: store (save a memory), recall (get a specific memory), search (find memories), list (show all in category), delete (remove a memory)'
  ),
  category: z.string().optional().describe(
    'Category for the memory (e.g., "preferences", "facts", "personal", "work"). Required for store, recall, list, delete.'
  ),
  key: z.string().optional().describe(
    'The topic/key of the memory (e.g., "favorite_color", "name", "job"). Required for store, recall, delete.'
  ),
  content: z.string().optional().describe(
    'The content to remember. Required for store operation.'
  ),
  query: z.string().optional().describe(
    'Search query to find memories. Required for search operation.'
  ),
});

type MemoryInput = z.infer<typeof MemoryInputSchema>;

/**
 * Memory Tool Implementation
 */
export class MemoryTool extends BaseTool {
  private memoryStore: MemoryStore;

  readonly name = 'memory';

  readonly description = 'Store and recall long-term memories about the user or important facts. Use this to remember things across conversations like user preferences, names, important dates, or any information the user wants you to remember.';

  readonly inputSchema = MemoryInputSchema;

  constructor(memoryStore?: MemoryStore) {
    super();
    this.memoryStore = memoryStore || createMemoryStore();
  }

  /**
   * Execute memory operations
   */
  async execute(input: unknown, _options?: ToolExecutionOptions): Promise<ToolResult> {
    const memoryInput = input as MemoryInput;
    switch (memoryInput.operation) {
      case 'store':
        return this.handleStore(memoryInput);
      case 'recall':
        return this.handleRecall(memoryInput);
      case 'search':
        return this.handleSearch(memoryInput);
      case 'list':
        return this.handleList(memoryInput);
      case 'delete':
        return this.handleDelete(memoryInput);
      default:
        return {
          success: false,
          error: `Unknown operation: ${(memoryInput as any).operation}`,
        };
    }
  }

  /**
   * Store a new memory
   */
  private async handleStore(input: MemoryInput): Promise<ToolResult> {
    if (!input.category) {
      return { success: false, error: 'Category is required for store operation' };
    }
    if (!input.key) {
      return { success: false, error: 'Key is required for store operation' };
    }
    if (!input.content) {
      return { success: false, error: 'Content is required for store operation' };
    }

    try {
      const entry = await this.memoryStore.store(
        input.category,
        input.key,
        input.content
      );

      return {
        success: true,
        data: {
          message: `Memory stored successfully`,
          id: entry.id,
          category: entry.category,
          key: entry.key,
          isUpdate: entry.createdAt.getTime() !== entry.updatedAt.getTime(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to store memory: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Recall a specific memory
   */
  private async handleRecall(input: MemoryInput): Promise<ToolResult> {
    if (!input.category) {
      return { success: false, error: 'Category is required for recall operation' };
    }
    if (!input.key) {
      return { success: false, error: 'Key is required for recall operation' };
    }

    try {
      const content = await this.memoryStore.recall(input.category, input.key);

      if (content === undefined) {
        return {
          success: true,
          data: {
            found: false,
            message: `No memory found for [${input.category}] ${input.key}`,
          },
        };
      }

      return {
        success: true,
        data: {
          found: true,
          category: input.category,
          key: input.key,
          content,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to recall memory: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Search memories
   */
  private async handleSearch(input: MemoryInput): Promise<ToolResult> {
    if (!input.query) {
      return { success: false, error: 'Query is required for search operation' };
    }

    try {
      const result = await this.memoryStore.search(input.query, input.category);

      if (result.entries.length === 0) {
        return {
          success: true,
          data: {
            found: false,
            message: `No memories found matching "${input.query}"`,
            totalCount: 0,
          },
        };
      }

      return {
        success: true,
        data: {
          found: true,
          totalCount: result.totalCount,
          memories: result.entries.map(e => ({
            category: e.category,
            key: e.key,
            content: e.content,
            updatedAt: e.updatedAt.toISOString(),
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search memories: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * List memories in a category
   */
  private async handleList(input: MemoryInput): Promise<ToolResult> {
    try {
      // If no category specified, list all categories
      if (!input.category) {
        const categories = await this.memoryStore.getCategories();
        const count = await this.memoryStore.getCount();

        return {
          success: true,
          data: {
            totalMemories: count,
            categories,
            message: categories.length > 0
              ? `Found ${categories.length} categories with ${count} total memories`
              : 'No memories stored yet',
          },
        };
      }

      // List memories in specific category
      const entries = await this.memoryStore.listByCategory(input.category);

      if (entries.length === 0) {
        return {
          success: true,
          data: {
            category: input.category,
            count: 0,
            message: `No memories in category "${input.category}"`,
          },
        };
      }

      return {
        success: true,
        data: {
          category: input.category,
          count: entries.length,
          memories: entries.map(e => ({
            key: e.key,
            content: e.content,
            updatedAt: e.updatedAt.toISOString(),
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list memories: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Delete a memory
   */
  private async handleDelete(input: MemoryInput): Promise<ToolResult> {
    if (!input.category) {
      return { success: false, error: 'Category is required for delete operation' };
    }
    if (!input.key) {
      return { success: false, error: 'Key is required for delete operation' };
    }

    try {
      const deleted = await this.memoryStore.deleteByKey(input.category, input.key);

      if (!deleted) {
        return {
          success: true,
          data: {
            deleted: false,
            message: `No memory found for [${input.category}] ${input.key}`,
          },
        };
      }

      return {
        success: true,
        data: {
          deleted: true,
          message: `Memory deleted: [${input.category}] ${input.key}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete memory: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get the memory store instance (for external access)
   */
  getMemoryStore(): MemoryStore {
    return this.memoryStore;
  }
}

/**
 * Factory function
 */
export function createMemoryTool(memoryStore?: MemoryStore): MemoryTool {
  return new MemoryTool(memoryStore);
}
