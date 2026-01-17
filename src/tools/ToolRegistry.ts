/**
 * Tool Registry
 *
 * Manages all available tools. This is the "toolbox" that keeps track
 * of every tool your agent can use.
 *
 * BEGINNER NOTE: This is the Registry Pattern - a central place to
 * register and retrieve tools. Like a phone book for tools!
 */


import type { ITool, ToolDefinition } from '../types/tool.types.js';
import { logger } from '../utils/logger.js';

/**
 * ToolRegistry class
 * BEGINNER NOTE: Singleton pattern - only one registry exists
 */
export class ToolRegistry {
  /**
   * Internal storage for tools
   * BEGINNER NOTE: Map is like an object but with better performance
   * Key = tool name, Value = tool instance
   */
  private tools: Map<string, ITool>;

  /**
   * Create a new ToolRegistry
   */
  constructor() {
    this.tools = new Map();
    logger.info('ToolRegistry initialized');
  }

  /**
   * Register a tool
   * BEGINNER NOTE: Add a tool to the registry so it can be used
   *
   * @param tool - The tool to register
   * @throws Error if a tool with the same name already exists
   */
  register(tool: ITool): void {
    // Check if tool name is already registered
    if (this.tools.has(tool.name)) {
      throw new Error(
        `Tool with name '${tool.name}' is already registered. ` +
        `Tool names must be unique.`
      );
    }

    // Validate tool name format
    if (!this.isValidToolName(tool.name)) {
      throw new Error(
        `Invalid tool name '${tool.name}'. ` +
        `Tool names must be lowercase, alphanumeric, and underscores only.`
      );
    }

    // Register the tool
    this.tools.set(tool.name, tool);
    logger.success(`Tool registered: ${tool.name}`);
  }

  /**
   * Register multiple tools at once
   * BEGINNER NOTE: Convenience method for bulk registration
   *
   * @param tools - Array of tools to register
   */
  registerMany(tools: ITool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Unregister a tool
   * BEGINNER NOTE: Remove a tool from the registry
   *
   * @param toolName - Name of the tool to remove
   * @returns true if tool was removed, false if it didn't exist
   */
  unregister(toolName: string): boolean {
    const removed = this.tools.delete(toolName);
    if (removed) {
      logger.info(`Tool unregistered: ${toolName}`);
    }
    return removed;
  }

  /**
   * Get a tool by name
   * BEGINNER NOTE: Look up a tool to use it
   *
   * @param toolName - Name of the tool to get
   * @returns The tool instance, or undefined if not found
   */
  getTool(toolName: string): ITool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Check if a tool is registered
   * BEGINNER NOTE: Check if a tool exists before trying to use it
   *
   * @param toolName - Name of the tool to check
   * @returns true if the tool exists, false otherwise
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get all registered tools
   * BEGINNER NOTE: Get an array of all available tools
   *
   * @returns Array of all tool instances
   */
  getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool names
   * BEGINNER NOTE: Get a list of tool names
   *
   * @returns Array of tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get the count of registered tools
   * BEGINNER NOTE: How many tools are available?
   *
   * @returns Number of registered tools
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Clear all tools
   * BEGINNER NOTE: Remove all tools from the registry
   */
  clear(): void {
    this.tools.clear();
    logger.info('All tools cleared from registry');
  }

  /**
   * Convert all tools to Anthropic API format
   * BEGINNER NOTE: Prepare tools for Claude to see and use
   *
   * @returns Array of tool definitions for Anthropic API
   */
  toAnthropicFormat(): ToolDefinition[] {
    return this.getAllTools().map((tool) => tool.toAnthropicFormat());
  }

  /**
   * Validate tool name format
   * BEGINNER NOTE: Tool names must follow specific rules
   *
   * @param name - The tool name to validate
   * @returns true if valid, false otherwise
   */
  private isValidToolName(name: string): boolean {
    // Must be lowercase, alphanumeric, and underscores only
    const validNameRegex = /^[a-z0-9_]+$/;
    return validNameRegex.test(name) && name.length > 0 && name.length <= 64;
  }

  /**
   * Get a summary of all registered tools
   * BEGINNER NOTE: Useful for debugging - shows what tools are available
   *
   * @returns A string describing all registered tools
   */
  getSummary(): string {
    const tools = this.getAllTools();

    if (tools.length === 0) {
      return 'No tools registered';
    }

    const lines = [
      `Registered Tools (${tools.length}):`,
      ...tools.map((tool) => `  - ${tool.name}: ${tool.description}`),
    ];

    return lines.join('\n');
  }

  /**
   * Print registry summary to console
   * BEGINNER NOTE: Quick way to see what tools are available
   */
  printSummary(): void {
    console.log(this.getSummary());
  }
}

/**
 * Create a new ToolRegistry
 * BEGINNER NOTE: Factory function for creating a registry
 */
export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}

/**
 * Singleton instance (optional - for convenience)
 * BEGINNER NOTE: A pre-created registry you can use anywhere
 */
let defaultRegistry: ToolRegistry | null = null;

/**
 * Get the default tool registry (creates it if it doesn't exist)
 * BEGINNER NOTE: Use this if you want a single shared registry
 */
export function getDefaultRegistry(): ToolRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createToolRegistry();
  }
  return defaultRegistry;
}
