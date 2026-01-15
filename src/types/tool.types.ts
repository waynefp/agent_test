/**
 * Tool Type Definitions
 *
 * These types define the structure of tools - functions that the agent can call
 * to perform actions like calculations, file operations, web searches, etc.
 *
 * BEGINNER NOTE: Think of tools as "superpowers" you give to the agent.
 * The agent decides WHEN to use them, but YOU define WHAT they can do.
 */

import { z } from 'zod';

/**
 * Result returned by a tool after execution
 * BEGINNER NOTE: Every tool returns this consistent structure,
 * making it easy to handle success and errors uniformly
 */
export interface ToolResult {
  /** Whether the tool executed successfully */
  success: boolean;

  /** The data returned by the tool (if successful) */
  data?: unknown;

  /** Error message (if failed) */
  error?: string;

  /** Optional metadata about the execution */
  metadata?: {
    /** How long the tool took to execute (in milliseconds) */
    executionTime?: number;

    /** Any warnings that occurred during execution */
    warnings?: string[];

    /** Additional context-specific data */
    [key: string]: unknown;
  };
}

/**
 * Represents a single use of a tool by the agent
 * BEGINNER NOTE: This tracks when the agent calls a tool,
 * what inputs it used, and what result it got
 */
export interface ToolUse {
  /** Unique identifier for this tool use */
  id: string;

  /** Name of the tool that was called */
  name: string;

  /** The input parameters passed to the tool */
  input: unknown;

  /** The result returned by the tool (undefined if not yet executed) */
  result?: ToolResult;

  /** When the tool was called */
  timestamp?: Date;
}

/**
 * Definition of a tool in Anthropic API format
 * BEGINNER NOTE: This is the format Claude expects when you tell it
 * about available tools. We'll convert our tool classes to this format.
 */
export interface ToolDefinition {
  /** Tool name (must be unique, lowercase, alphanumeric + underscores) */
  name: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** JSON Schema describing the tool's input parameters */
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Execution context passed to tools
 * BEGINNER NOTE: This gives tools access to useful information
 * like user ID, conversation ID, etc.
 */
export interface ToolExecutionContext {
  /** Optional user identifier */
  userId?: string;

  /** Optional conversation identifier */
  conversationId?: string;

  /** Optional task identifier */
  taskId?: string;

  /** Any additional context data */
  [key: string]: unknown;
}

/**
 * Options for tool execution
 */
export interface ToolExecutionOptions {
  /** Maximum time (in ms) to allow tool to execute */
  timeout?: number;

  /** Whether to retry on failure */
  retry?: {
    /** Maximum number of retry attempts */
    maxAttempts: number;

    /** Delay between retries (in ms) */
    delay: number;
  };

  /** Execution context */
  context?: ToolExecutionContext;
}

/**
 * Base interface that all tool classes must implement
 * BEGINNER NOTE: This is a contract - any tool you create MUST have these properties
 */
export interface ITool {
  /** Unique name for this tool */
  readonly name: string;

  /** Description of what this tool does */
  readonly description: string;

  /** Zod schema for validating input */
  readonly inputSchema: z.ZodSchema;

  /**
   * Execute the tool with given input
   * BEGINNER NOTE: This is where the actual work happens!
   *
   * @param input - The input data (will be validated against inputSchema)
   * @param options - Optional execution options
   * @returns A promise that resolves to a ToolResult
   */
  execute(input: unknown, options?: ToolExecutionOptions): Promise<ToolResult>;

  /**
   * Validate input against the schema
   * BEGINNER NOTE: Call this before execute() to check if input is valid
   *
   * @param input - The input to validate
   * @returns true if valid, false otherwise
   */
  validate(input: unknown): boolean;

  /**
   * Convert this tool to Anthropic API format
   * BEGINNER NOTE: This transforms our tool into the format Claude understands
   *
   * @returns A ToolDefinition object
   */
  toAnthropicFormat(): ToolDefinition;
}

/**
 * Error thrown when tool execution fails
 */
export class ToolExecutionError extends Error {
  constructor(
    public toolName: string,
    public originalError: Error,
    public input?: unknown
  ) {
    super(`Tool '${toolName}' failed: ${originalError.message}`);
    this.name = 'ToolExecutionError';
  }
}

/**
 * Error thrown when tool input validation fails
 */
export class ToolValidationError extends Error {
  constructor(
    public toolName: string,
    public validationErrors: z.ZodError,
    public input: unknown
  ) {
    super(
      `Tool '${toolName}' received invalid input:\n${validationErrors.errors
        .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
        .join('\n')}`
    );
    this.name = 'ToolValidationError';
  }
}

/**
 * Type guard to check if an object is a ToolResult
 * BEGINNER NOTE: Type guards help TypeScript understand what type something is
 */
export function isToolResult(obj: unknown): obj is ToolResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    typeof (obj as ToolResult).success === 'boolean'
  );
}
