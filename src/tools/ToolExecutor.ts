/**
 * Tool Executor
 *
 * Executes tools by name with given input.
 * Handles tool lookup, execution, and error handling.
 *
 * BEGINNER NOTE: This is like a "tool runner" - you give it a tool name
 * and parameters, and it finds and runs the tool for you.
 */

import type { ToolRegistry } from './ToolRegistry.js';
import type {
  ToolResult,
  ToolExecutionOptions,
  ToolUse,
} from '../types/tool.types.js';
import { ToolExecutionError } from '../types/tool.types.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * ToolExecutor class
 * BEGINNER NOTE: This finds tools in the registry and runs them
 */
export class ToolExecutor {
  /**
   * Create a new ToolExecutor
   *
   * @param registry - The tool registry to use
   */
  constructor(private registry: ToolRegistry) {
    logger.info('ToolExecutor initialized');
  }

  /**
   * Execute a tool by name
   * BEGINNER NOTE: Main method - give it a tool name and input, get a result
   *
   * @param toolName - Name of the tool to execute
   * @param input - Input parameters for the tool
   * @param options - Optional execution options
   * @returns Promise that resolves to a ToolResult
   * @throws ToolExecutionError if tool not found or execution fails
   */
  async executeTool(
    toolName: string,
    input: unknown,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    // Find the tool in the registry
    const tool = this.registry.getTool(toolName);

    if (!tool) {
      const availableTools = this.registry.getToolNames().join(', ');
      throw new ToolExecutionError(
        toolName,
        new Error(
          `Tool '${toolName}' not found. Available tools: ${availableTools}`
        ),
        input
      );
    }

    // Execute the tool using its run() method
    // BEGINNER NOTE: BaseTool.run() handles validation and error handling
    try {
      return await tool.run(input, options);
    } catch (error) {
      // If it's already a ToolExecutionError, rethrow it
      if (error instanceof ToolExecutionError) {
        throw error;
      }

      // Wrap other errors
      throw new ToolExecutionError(
        toolName,
        error instanceof Error ? error : new Error(String(error)),
        input
      );
    }
  }

  /**
   * Execute a tool and return a ToolUse object
   * BEGINNER NOTE: This wraps the result in a ToolUse object with metadata
   *
   * @param toolName - Name of the tool to execute
   * @param input - Input parameters for the tool
   * @param options - Optional execution options
   * @returns Promise that resolves to a ToolUse object
   */
  async executeToolWithMetadata(
    toolName: string,
    input: unknown,
    options?: ToolExecutionOptions
  ): Promise<ToolUse> {
    const toolUse: ToolUse = {
      id: randomUUID(),
      name: toolName,
      input,
      timestamp: new Date(),
    };

    try {
      const result = await this.executeTool(toolName, input, options);
      toolUse.result = result;
      return toolUse;
    } catch (error) {
      // Store the error in the result
      toolUse.result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }

  /**
   * Execute multiple tools in sequence
   * BEGINNER NOTE: Run several tools one after another
   *
   * @param toolCalls - Array of {name, input} pairs
   * @param options - Optional execution options
   * @returns Promise that resolves to an array of ToolUse objects
   */
  async executeMany(
    toolCalls: Array<{ name: string; input: unknown }>,
    options?: ToolExecutionOptions
  ): Promise<ToolUse[]> {
    const results: ToolUse[] = [];

    for (const call of toolCalls) {
      try {
        const result = await this.executeToolWithMetadata(
          call.name,
          call.input,
          options
        );
        results.push(result);
      } catch (error) {
        // Continue executing other tools even if one fails
        logger.warn(`Tool ${call.name} failed, continuing with remaining tools`);
        // The error is already stored in the ToolUse result
        results.push({
          id: randomUUID(),
          name: call.name,
          input: call.input,
          timestamp: new Date(),
          result: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    return results;
  }

  /**
   * Execute multiple tools in parallel
   * BEGINNER NOTE: Run several tools at the same time (faster!)
   *
   * @param toolCalls - Array of {name, input} pairs
   * @param options - Optional execution options
   * @returns Promise that resolves to an array of ToolUse objects
   */
  async executeManyParallel(
    toolCalls: Array<{ name: string; input: unknown }>,
    options?: ToolExecutionOptions
  ): Promise<ToolUse[]> {
    // Create promises for all tool executions
    const promises = toolCalls.map(async (call) => {
      try {
        return await this.executeToolWithMetadata(call.name, call.input, options);
      } catch (error) {
        // Catch errors and return them as failed ToolUse objects
        return {
          id: randomUUID(),
          name: call.name,
          input: call.input,
          timestamp: new Date(),
          result: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        };
      }
    });

    // Wait for all to complete
    return Promise.all(promises);
  }

  /**
   * Check if a tool exists
   * BEGINNER NOTE: Quick check before trying to execute
   *
   * @param toolName - Name of the tool to check
   * @returns true if the tool exists, false otherwise
   */
  hasToolAvailable(toolName: string): boolean {
    return this.registry.hasTool(toolName);
  }

  /**
   * Get list of available tool names
   * BEGINNER NOTE: See what tools you can use
   *
   * @returns Array of tool names
   */
  getAvailableTools(): string[] {
    return this.registry.getToolNames();
  }
}

/**
 * Create a new ToolExecutor
 * BEGINNER NOTE: Factory function for creating an executor
 *
 * @param registry - The tool registry to use
 * @returns A new ToolExecutor instance
 */
export function createToolExecutor(registry: ToolRegistry): ToolExecutor {
  return new ToolExecutor(registry);
}
