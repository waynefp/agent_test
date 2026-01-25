# 03 - Tool System

**Phase:** 3
**Goal:** Build an extensible tool architecture
**Prerequisites:** [02-core-agent.md](./02-core-agent.md)

---

## What You'll Learn

- What tools are and why they matter
- How to define tool schemas (JSON Schema)
- Building a reusable BaseTool class
- Creating a tool registry for management
- Using Zod for input validation

---

## 1. What Are Tools?

Tools are **functions that Claude can choose to call**. They give your agent capabilities beyond just generating text.

### Without Tools
```
User: What's 847 × 293?
Claude: Let me calculate... 847 × 293 = 248,171
         (Claude might get this wrong!)
```

### With Tools
```
User: What's 847 × 293?
Claude: I'll use the calculator tool.
        [Calls calculator(multiply, 847, 293)]
        The result is 248,171.
        (Guaranteed correct!)
```

### Common Tool Examples

| Tool | What It Does |
|------|-------------|
| Calculator | Accurate math operations |
| File System | Read/write files |
| Web Search | Find information online |
| Database | Query and update data |
| Code Runner | Execute code snippets |
| API Caller | Interact with external services |

---

## 2. Tool Schema (JSON Schema)

Claude needs to know what tools are available and how to use them. This is defined using JSON Schema.

### Basic Structure

```typescript
interface Tool {
  name: string;           // Unique identifier (lowercase, underscores)
  description: string;    // What the tool does (helps Claude decide when to use it)
  input_schema: {         // JSON Schema defining the inputs
    type: "object";
    properties: {
      [key: string]: PropertySchema;
    };
    required: string[];   // Which properties are mandatory
  };
}

interface PropertySchema {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;   // Helps Claude understand the parameter
  enum?: string[];        // Restrict to specific values
  default?: any;          // Default value if not provided
}
```

### Example: Calculator Tool Schema

```typescript
const calculatorTool: Anthropic.Tool = {
  name: "calculator",
  description: "Performs basic arithmetic operations. Use this for any math calculations.",
  input_schema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "The math operation to perform",
        enum: ["add", "subtract", "multiply", "divide"],
      },
      a: {
        type: "number",
        description: "The first number",
      },
      b: {
        type: "number",
        description: "The second number",
      },
    },
    required: ["operation", "a", "b"],
  },
};
```

### Schema Tips

1. **Good descriptions are crucial** - Claude uses them to decide when to use the tool
2. **Use enums** - When there's a fixed set of valid values
3. **Mark required fields** - Don't make Claude guess what's optional
4. **Keep it simple** - Complex schemas confuse the model

---

## 3. Using Zod for Validation

[Zod](https://zod.dev) is a TypeScript-first schema validation library. It's perfect for tools because:
- Define schema once, get TypeScript types automatically
- Validate inputs at runtime
- Convert to JSON Schema for the API

### Basic Zod Usage

```typescript
import { z } from "zod";

// Define schema
const CalculatorInput = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
  a: z.number(),
  b: z.number(),
});

// Infer TypeScript type from schema
type CalculatorInputType = z.infer<typeof CalculatorInput>;
// Result: { operation: "add" | "subtract" | "multiply" | "divide"; a: number; b: number }

// Validate input
const result = CalculatorInput.safeParse({
  operation: "add",
  a: 5,
  b: 3,
});

if (result.success) {
  console.log(result.data); // Typed as CalculatorInputType
} else {
  console.log(result.error.issues); // Validation errors
}
```

### Zod to JSON Schema

```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const InputSchema = z.object({
  query: z.string().describe("Search query"),
  limit: z.number().optional().default(10).describe("Max results"),
});

// Convert to JSON Schema for Anthropic API
const jsonSchema = zodToJsonSchema(InputSchema, { target: "openApi3" });
```

### Common Zod Patterns

```typescript
// String with constraints
z.string().min(1).max(100)

// Number with range
z.number().min(0).max(100)

// Optional with default
z.string().optional().default("default value")

// Array of specific type
z.array(z.string())

// Union (one of several types)
z.union([z.string(), z.number()])

// Literal value
z.literal("specific_value")

// Enum
z.enum(["option1", "option2", "option3"])

// Object with specific shape
z.object({
  name: z.string(),
  age: z.number().optional(),
})
```

---

## 4. The BaseTool Abstract Class

Create a base class that all tools inherit from. This ensures consistency and reduces boilerplate.

### Implementation

```typescript
// src/tools/definitions/BaseTool.ts
import Anthropic from "@anthropic-ai/sdk";
import { z, ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Result returned by all tools
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    executionTime?: number;
    [key: string]: unknown;
  };
}

// Options for tool execution
export interface ToolExecutionOptions {
  timeout?: number;
  context?: Record<string, unknown>;
}

export abstract class BaseTool<TInput = unknown> {
  // Abstract properties - subclasses MUST define these
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: ZodSchema<TInput>;

  // Abstract method - the actual tool logic
  protected abstract execute(
    input: TInput,
    options?: ToolExecutionOptions
  ): Promise<ToolResult>;

  // Validate input against schema
  validate(input: unknown): { success: true; data: TInput } | { success: false; error: string } {
    const result = this.inputSchema.safeParse(input);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errorMessages = result.error.issues
      .map(issue => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    return { success: false, error: `Validation failed: ${errorMessages}` };
  }

  // Safe execution wrapper - validates then executes
  async run(input: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    const startTime = Date.now();

    // Validate input
    const validation = this.validate(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    try {
      // Execute with validated input
      const result = await this.execute(validation.data, options);

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metadata: { executionTime: Date.now() - startTime },
      };
    }
  }

  // Convert to Anthropic API format
  toAnthropicFormat(): Anthropic.Tool {
    const jsonSchema = zodToJsonSchema(this.inputSchema, {
      target: "openApi3",
      $refStrategy: "none",
    });

    return {
      name: this.name,
      description: this.description,
      input_schema: jsonSchema as Anthropic.Tool["input_schema"],
    };
  }
}
```

### Key Design Decisions

1. **Abstract class** - Forces subclasses to implement required properties
2. **Generic `TInput`** - Type-safe input handling
3. **Validation before execution** - Never run with invalid input
4. **Consistent result format** - All tools return `ToolResult`
5. **Automatic timing** - Track execution time for debugging
6. **Error catching** - Never let tools crash the agent

---

## 5. Creating a Tool (Calculator Example)

```typescript
// src/tools/definitions/CalculatorTool.ts
import { z } from "zod";
import { BaseTool, ToolResult, ToolExecutionOptions } from "./BaseTool.js";

// Define input schema with Zod
const CalculatorInputSchema = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide"])
    .describe("The arithmetic operation to perform"),
  a: z.number().describe("First operand"),
  b: z.number().describe("Second operand"),
});

// Infer type from schema
type CalculatorInput = z.infer<typeof CalculatorInputSchema>;

export class CalculatorTool extends BaseTool<CalculatorInput> {
  readonly name = "calculator";
  readonly description = "Performs basic arithmetic operations (add, subtract, multiply, divide). Use this for any mathematical calculations.";
  readonly inputSchema = CalculatorInputSchema;

  protected async execute(
    input: CalculatorInput,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    const { operation, a, b } = input;

    // Handle division by zero
    if (operation === "divide" && b === 0) {
      return {
        success: false,
        error: "Cannot divide by zero",
      };
    }

    // Perform calculation
    const operations: Record<string, number> = {
      add: a + b,
      subtract: a - b,
      multiply: a * b,
      divide: a / b,
    };

    const result = operations[operation];

    // Return with human-readable format
    const symbols: Record<string, string> = {
      add: "+",
      subtract: "-",
      multiply: "×",
      divide: "÷",
    };

    return {
      success: true,
      data: {
        result,
        expression: `${a} ${symbols[operation]} ${b} = ${result}`,
      },
    };
  }
}
```

---

## 6. Tool Registry

A central place to manage all tools. Makes it easy to add, remove, and find tools.

```typescript
// src/tools/ToolRegistry.ts
import { BaseTool } from "./definitions/BaseTool.js";
import Anthropic from "@anthropic-ai/sdk";

export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();

  // Valid tool name pattern
  private static readonly NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

  // Register a tool
  register(tool: BaseTool): void {
    const name = tool.name;

    // Validate name format
    if (!ToolRegistry.NAME_PATTERN.test(name)) {
      throw new Error(
        `Invalid tool name: "${name}". Must be lowercase, start with letter, ` +
        `and contain only letters, numbers, and underscores.`
      );
    }

    // Check for duplicates
    if (this.tools.has(name)) {
      throw new Error(`Tool "${name}" is already registered.`);
    }

    this.tools.set(name, tool);
  }

  // Register multiple tools at once
  registerMany(tools: BaseTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  // Get a specific tool
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  // Check if tool exists
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  // Get all tools
  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  // Get tool names
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  // Remove a tool
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  // Clear all tools
  clear(): void {
    this.tools.clear();
  }

  // Convert all tools to Anthropic format
  toAnthropicFormat(): Anthropic.Tool[] {
    return this.getAllTools().map(tool => tool.toAnthropicFormat());
  }

  // Get count
  get size(): number {
    return this.tools.size;
  }
}

// Optional: Create a singleton instance
export const globalRegistry = new ToolRegistry();
```

### Usage

```typescript
import { ToolRegistry } from "./ToolRegistry.js";
import { CalculatorTool } from "./definitions/CalculatorTool.js";

// Create registry
const registry = new ToolRegistry();

// Register tools
registry.register(new CalculatorTool());
// registry.register(new FileSystemTool());
// registry.register(new WebSearchTool());

// Get tools for API call
const tools = registry.toAnthropicFormat();

// Use in API call
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  tools: tools,  // <-- Pass registered tools
  messages: [...],
});
```

---

## 7. Complete Example: Custom Tool

Let's create a more practical tool - a timestamp generator:

```typescript
// src/tools/definitions/TimestampTool.ts
import { z } from "zod";
import { BaseTool, ToolResult } from "./BaseTool.js";

const TimestampInputSchema = z.object({
  format: z.enum(["iso", "unix", "readable", "date_only", "time_only"])
    .default("iso")
    .describe("Output format for the timestamp"),
  timezone: z.string()
    .optional()
    .default("UTC")
    .describe("Timezone (e.g., 'America/New_York', 'UTC')"),
});

type TimestampInput = z.infer<typeof TimestampInputSchema>;

export class TimestampTool extends BaseTool<TimestampInput> {
  readonly name = "get_timestamp";
  readonly description = "Gets the current date and time in various formats. Useful when the user asks about current time or needs timestamps.";
  readonly inputSchema = TimestampInputSchema;

  protected async execute(input: TimestampInput): Promise<ToolResult> {
    const { format, timezone } = input;
    const now = new Date();

    let result: string;

    switch (format) {
      case "iso":
        result = now.toISOString();
        break;
      case "unix":
        result = Math.floor(now.getTime() / 1000).toString();
        break;
      case "readable":
        result = now.toLocaleString("en-US", { timeZone: timezone });
        break;
      case "date_only":
        result = now.toLocaleDateString("en-US", { timeZone: timezone });
        break;
      case "time_only":
        result = now.toLocaleTimeString("en-US", { timeZone: timezone });
        break;
      default:
        result = now.toISOString();
    }

    return {
      success: true,
      data: {
        timestamp: result,
        format,
        timezone,
      },
    };
  }
}
```

---

## Exercises

### Exercise 1: Random Number Tool
Create a tool that generates random numbers:
- Input: `min` (number), `max` (number), `count` (optional, default 1)
- Output: Array of random integers between min and max

### Exercise 2: Text Transform Tool
Create a tool that transforms text:
- Input: `text` (string), `operation` (uppercase, lowercase, reverse, word_count)
- Output: Transformed text or word count

### Exercise 3: Extend the Registry
Add these methods to ToolRegistry:
- `getToolsByPrefix(prefix: string)` - Get tools whose names start with prefix
- `exportConfig()` - Export all tool schemas as JSON

<details>
<summary>Exercise 1 Solution</summary>

```typescript
import { z } from "zod";
import { BaseTool, ToolResult } from "./BaseTool.js";

const RandomNumberInputSchema = z.object({
  min: z.number().describe("Minimum value (inclusive)"),
  max: z.number().describe("Maximum value (inclusive)"),
  count: z.number().min(1).max(100).optional().default(1)
    .describe("How many random numbers to generate"),
});

type RandomNumberInput = z.infer<typeof RandomNumberInputSchema>;

export class RandomNumberTool extends BaseTool<RandomNumberInput> {
  readonly name = "random_number";
  readonly description = "Generates random integers within a specified range.";
  readonly inputSchema = RandomNumberInputSchema;

  protected async execute(input: RandomNumberInput): Promise<ToolResult> {
    const { min, max, count } = input;

    if (min > max) {
      return { success: false, error: "min must be less than or equal to max" };
    }

    const numbers: number[] = [];
    for (let i = 0; i < count; i++) {
      numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }

    return {
      success: true,
      data: {
        numbers,
        range: { min, max },
        count: numbers.length,
      },
    };
  }
}
```
</details>

<details>
<summary>Exercise 2 Solution</summary>

```typescript
import { z } from "zod";
import { BaseTool, ToolResult } from "./BaseTool.js";

const TextTransformInputSchema = z.object({
  text: z.string().min(1).describe("Text to transform"),
  operation: z.enum(["uppercase", "lowercase", "reverse", "word_count"])
    .describe("Transformation to apply"),
});

type TextTransformInput = z.infer<typeof TextTransformInputSchema>;

export class TextTransformTool extends BaseTool<TextTransformInput> {
  readonly name = "text_transform";
  readonly description = "Transforms text (uppercase, lowercase, reverse) or counts words.";
  readonly inputSchema = TextTransformInputSchema;

  protected async execute(input: TextTransformInput): Promise<ToolResult> {
    const { text, operation } = input;

    let result: string | number;

    switch (operation) {
      case "uppercase":
        result = text.toUpperCase();
        break;
      case "lowercase":
        result = text.toLowerCase();
        break;
      case "reverse":
        result = text.split("").reverse().join("");
        break;
      case "word_count":
        result = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        break;
    }

    return {
      success: true,
      data: {
        original: text,
        operation,
        result,
      },
    };
  }
}
```
</details>

<details>
<summary>Exercise 3 Solution</summary>

```typescript
// Add to ToolRegistry class

getToolsByPrefix(prefix: string): BaseTool[] {
  return this.getAllTools().filter(tool =>
    tool.name.startsWith(prefix.toLowerCase())
  );
}

exportConfig(): string {
  const config = {
    version: "1.0",
    tools: this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      schema: tool.toAnthropicFormat().input_schema,
    })),
  };
  return JSON.stringify(config, null, 2);
}
```
</details>

---

## Quick Reference

### Define Tool Schema with Zod
```typescript
const MyInputSchema = z.object({
  param1: z.string().describe("Description"),
  param2: z.number().optional().default(10),
  param3: z.enum(["a", "b", "c"]),
});
```

### Create Tool Class
```typescript
class MyTool extends BaseTool<MyInput> {
  readonly name = "my_tool";
  readonly description = "What it does";
  readonly inputSchema = MyInputSchema;

  protected async execute(input: MyInput): Promise<ToolResult> {
    // Your logic here
    return { success: true, data: result };
  }
}
```

### Register Tool
```typescript
const registry = new ToolRegistry();
registry.register(new MyTool());
```

### Use in API Call
```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  tools: registry.toAnthropicFormat(),
  messages: [...],
});
```

---

## Key Takeaways

1. **Tools extend capabilities** - Let Claude do things beyond text generation
2. **Good descriptions matter** - Claude uses them to decide when to use tools
3. **Validate inputs** - Use Zod to catch errors before execution
4. **Consistent interface** - BaseTool ensures all tools work the same way
5. **Registry pattern** - Central management makes tools easy to work with
6. **Return structured results** - Always include success status and metadata

---

**Next:** [04-agentic-loop.md](./04-agentic-loop.md) - Making Claude use tools autonomously
