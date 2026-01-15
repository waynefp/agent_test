/**
 * Calculator Tool
 *
 * A simple calculator that performs basic math operations.
 * This is a great example of how to create a tool!
 *
 * BEGINNER NOTE: Study this file carefully - it's the template
 * for creating all future tools. Notice how it extends BaseTool
 * and implements all required methods.
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';

/**
 * Input schema for the calculator
 * BEGINNER NOTE: Zod schemas define and validate the structure of data
 */
const CalculatorInputSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide'], {
    description: 'The mathematical operation to perform',
  }),
  a: z.number({
    description: 'The first number',
  }),
  b: z.number({
    description: 'The second number',
  }),
});

/**
 * Type for the calculator input
 * BEGINNER NOTE: TypeScript can infer the type from the Zod schema!
 * This gives us type safety AND runtime validation
 */
type CalculatorInput = z.infer<typeof CalculatorInputSchema>;

/**
 * Calculator Tool
 * BEGINNER NOTE: This class 'extends' BaseTool, meaning it inherits
 * all the methods and properties from BaseTool. We only need to
 * implement the abstract methods (name, description, inputSchema, execute)
 */
export class CalculatorTool extends BaseTool {
  /**
   * Tool name (must be unique and follow naming rules)
   * BEGINNER NOTE: lowercase, alphanumeric, underscores only
   */
  readonly name = 'calculator';

  /**
   * Human-readable description
   * BEGINNER NOTE: This is what Claude sees! Make it clear.
   */
  readonly description =
    'Performs basic mathematical operations (addition, subtraction, multiplication, division). ' +
    'Use this tool when you need to calculate numbers.';

  /**
   * Input validation schema
   * BEGINNER NOTE: This is checked before execute() is called
   */
  readonly inputSchema = CalculatorInputSchema;

  /**
   * Execute the calculation
   * BEGINNER NOTE: This is where the actual work happens!
   *
   * @param input - The calculation parameters (already validated!)
   * @param options - Optional execution options
   * @returns The calculation result
   */
  async execute(
    input: unknown,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    // Cast input to the correct type
    // BEGINNER NOTE: We know it's valid because validate() was called first
    const { operation, a, b } = input as CalculatorInput;

    try {
      let result: number;

      // Perform the calculation based on the operation
      switch (operation) {
        case 'add':
          result = a + b;
          break;

        case 'subtract':
          result = a - b;
          break;

        case 'multiply':
          result = a * b;
          break;

        case 'divide':
          // Check for division by zero
          if (b === 0) {
            return {
              success: false,
              error: 'Cannot divide by zero',
              metadata: {
                operation,
                a,
                b,
              },
            };
          }
          result = a / b;
          break;

        default:
          // This should never happen because Zod validates the operation
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }

      // Return success result
      return {
        success: true,
        data: {
          operation,
          a,
          b,
          result,
          // Include a human-readable string
          expression: `${a} ${this.getOperationSymbol(operation)} ${b} = ${result}`,
        },
      };
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          operation,
          a,
          b,
        },
      };
    }
  }

  /**
   * Helper function to get the mathematical symbol for an operation
   * BEGINNER NOTE: Private helper methods make code cleaner
   *
   * @param operation - The operation name
   * @returns The mathematical symbol
   */
  private getOperationSymbol(operation: CalculatorInput['operation']): string {
    const symbols = {
      add: '+',
      subtract: '-',
      multiply: '×',
      divide: '÷',
    };
    return symbols[operation];
  }
}

/**
 * Factory function to create a CalculatorTool
 * BEGINNER NOTE: Using a factory function is a common pattern
 */
export function createCalculatorTool(): CalculatorTool {
  return new CalculatorTool();
}
