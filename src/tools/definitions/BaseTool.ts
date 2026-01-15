/**
 * Base Tool Class
 *
 * Abstract base class that all tools must inherit from.
 * This ensures all tools have a consistent interface.
 *
 * BEGINNER NOTE: Think of this as a "contract" - any tool you create
 * MUST implement these methods. This is the Strategy Pattern in action!
 */

import { z } from 'zod';
import type {
  ITool,
  ToolResult,
  ToolDefinition,
  ToolExecutionOptions,
  ToolExecutionContext,
} from '../../types/tool.types.js';
import { ToolValidationError, ToolExecutionError } from '../../types/tool.types.js';
import { logger } from '../../utils/logger.js';

/**
 * Abstract base class for all tools
 *
 * BEGINNER NOTE: 'abstract' means you can't create a BaseTool directly.
 * You must create a class that extends (inherits from) BaseTool.
 *
 * Example:
 *   class CalculatorTool extends BaseTool { ... }
 */
export abstract class BaseTool implements ITool {
  /**
   * Unique name for this tool
   * BEGINNER NOTE: Must be lowercase, alphanumeric, and underscores only
   * Examples: "calculator", "file_reader", "web_search"
   */
  abstract readonly name: string;

  /**
   * Human-readable description
   * BEGINNER NOTE: This tells Claude what the tool does!
   * Be clear and concise.
   */
  abstract readonly description: string;

  /**
   * Zod schema for input validation
   * BEGINNER NOTE: This defines what inputs the tool accepts
   * and validates them before execution
   */
  abstract readonly inputSchema: z.ZodSchema;

  /**
   * Execute the tool with given input
   * BEGINNER NOTE: This is where the actual work happens!
   * Subclasses MUST implement this method.
   *
   * @param input - The input data (will be validated first)
   * @param options - Optional execution options
   * @returns A promise that resolves to a ToolResult
   */
  abstract execute(
    input: unknown,
    options?: ToolExecutionOptions
  ): Promise<ToolResult>;

  /**
   * Validate input against the schema
   * BEGINNER NOTE: This is automatically implemented for all tools.
   * It checks if the input matches the expected format.
   *
   * @param input - The input to validate
   * @returns true if valid, throws error if invalid
   */
  validate(input: unknown): boolean {
    try {
      this.inputSchema.parse(input);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ToolValidationError(this.name, error, input);
      }
      throw error;
    }
  }

  /**
   * Safe execute with validation and error handling
   * BEGINNER NOTE: This wraps execute() with validation and timing.
   * Use this instead of calling execute() directly!
   *
   * @param input - The input data
   * @param options - Optional execution options
   * @returns A promise that resolves to a ToolResult
   */
  async run(
    input: unknown,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Log the tool call
      logger.tool(this.name, 'called', input);

      // Validate input
      this.validate(input);

      // Execute the tool
      const result = await this.executeWithTimeout(input, options);

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Log success
      logger.tool(this.name, `completed in ${executionTime}ms`, {
        success: result.success,
      });

      // Add execution time to metadata
      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`Tool ${this.name} failed after ${executionTime}ms`, error);

      // If it's already a ToolValidationError or ToolExecutionError, rethrow
      if (
        error instanceof ToolValidationError ||
        error instanceof ToolExecutionError
      ) {
        throw error;
      }

      // Wrap other errors in ToolExecutionError
      throw new ToolExecutionError(
        this.name,
        error instanceof Error ? error : new Error(String(error)),
        input
      );
    }
  }

  /**
   * Execute with optional timeout
   * BEGINNER NOTE: Prevents tools from running forever
   *
   * @param input - The input data
   * @param options - Optional execution options
   * @returns A promise that resolves to a ToolResult
   */
  private async executeWithTimeout(
    input: unknown,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    const timeout = options?.timeout;

    if (!timeout) {
      // No timeout, execute normally
      return this.execute(input, options);
    }

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeout}ms`));
      }, timeout);
    });

    // Race between execution and timeout
    return Promise.race([this.execute(input, options), timeoutPromise]);
  }

  /**
   * Convert this tool to Anthropic API format
   * BEGINNER NOTE: Claude needs tools in a specific format.
   * This converts our tool to that format automatically!
   *
   * @returns A ToolDefinition for the Anthropic API
   */
  toAnthropicFormat(): ToolDefinition {
    // Convert Zod schema to JSON Schema
    // BEGINNER NOTE: Zod schemas need to be converted to JSON Schema
    // format for the Anthropic API
    const jsonSchema = this.zodToJsonSchema(this.inputSchema);

    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: jsonSchema.properties || {},
        required: jsonSchema.required || [],
      },
    };
  }

  /**
   * Convert Zod schema to JSON Schema
   * BEGINNER NOTE: This is a simplified conversion.
   * For complex schemas, you might want to use a library like zod-to-json-schema
   *
   * @param schema - The Zod schema
   * @returns A JSON Schema object
   */
  private zodToJsonSchema(schema: z.ZodSchema): any {
    // This is a simplified implementation
    // For production, consider using the 'zod-to-json-schema' package

    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.zodTypeToJsonSchema(value as z.ZodTypeAny);

        // Check if the field is required
        if (!(value as z.ZodTypeAny).isOptional()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required,
      };
    }

    return this.zodTypeToJsonSchema(schema);
  }

  /**
   * Convert individual Zod type to JSON Schema type
   * BEGINNER NOTE: Maps Zod types to JSON Schema types
   *
   * @param zodType - A Zod type
   * @returns JSON Schema representation
   */
  private zodTypeToJsonSchema(zodType: z.ZodTypeAny): any {
    // Handle different Zod types
    if (zodType instanceof z.ZodString) {
      return { type: 'string' };
    }

    if (zodType instanceof z.ZodNumber) {
      return { type: 'number' };
    }

    if (zodType instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    }

    if (zodType instanceof z.ZodEnum) {
      return {
        type: 'string',
        enum: zodType._def.values,
      };
    }

    if (zodType instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodTypeToJsonSchema(zodType._def.type),
      };
    }

    if (zodType instanceof z.ZodObject) {
      return this.zodToJsonSchema(zodType);
    }

    if (zodType instanceof z.ZodOptional) {
      return this.zodTypeToJsonSchema(zodType._def.innerType);
    }

    if (zodType instanceof z.ZodNullable) {
      const inner = this.zodTypeToJsonSchema(zodType._def.innerType);
      return { ...inner, nullable: true };
    }

    // Default fallback
    return { type: 'string' };
  }

  /**
   * Get a human-readable description of the tool
   * BEGINNER NOTE: Useful for debugging and logging
   */
  toString(): string {
    return `${this.name}: ${this.description}`;
  }
}
