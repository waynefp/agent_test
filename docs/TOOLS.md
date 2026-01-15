

# Tool Development Guide

Learn how to create custom tools for your agent.

## Table of Contents
- [What Are Tools?](#what-are-tools)
- [Tool Architecture](#tool-architecture)
- [Creating Your First Tool](#creating-your-first-tool)
- [Tool Best Practices](#tool-best-practices)
- [Testing Tools](#testing-tools)
- [Common Patterns](#common-patterns)

---

## What Are Tools?

Tools are **special abilities** you give to your agent. Think of them as functions Claude can call to perform actions:

- 🧮 **Calculator** - Perform math operations
- 📁 **File Reader** - Read files from disk
- 🌐 **Web Search** - Search the internet
- 📧 **Email Sender** - Send emails
- 🗄️ **Database Query** - Query databases

**The agent decides WHEN to use tools, but YOU define WHAT they can do.**

---

## Tool Architecture

### The Three Components

1. **BaseTool** - Abstract base class all tools inherit from
2. **ToolRegistry** - Manages all available tools
3. **ToolExecutor** - Executes tools by name

```
┌──────────────┐
│  BaseTool    │  ← Abstract base class
│  (Abstract)  │
└──────┬───────┘
       │ extends
       ├─────────────┬──────────────┬────────────────┐
       ▼             ▼              ▼                ▼
┌─────────────┐ ┌──────────┐ ┌──────────┐  ┌──────────────┐
│ Calculator  │ │ FileSys  │ │WebSearch │  │ YourCustom   │
│    Tool     │ │   Tool   │ │   Tool   │  │    Tool      │
└─────────────┘ └──────────┘ └──────────┘  └──────────────┘
```

### Tool Lifecycle

```
1. Define Tool     → Create a class that extends BaseTool
2. Register Tool   → Add to ToolRegistry
3. Agent Calls     → Claude decides to use the tool
4. Execute Tool    → ToolExecutor runs it
5. Return Result   → Send result back to Claude
```

---

## Creating Your First Tool

### Step 1: Define the Input Schema

Use Zod to define what inputs your tool accepts:

```typescript
import { z } from 'zod';

const WeatherInputSchema = z.object({
  city: z.string({
    description: 'Name of the city',
  }),
  units: z.enum(['celsius', 'fahrenheit'], {
    description: 'Temperature units',
  }).optional().default('celsius'),
});

type WeatherInput = z.infer<typeof WeatherInputSchema>;
```

**Zod Benefits:**
- ✅ Runtime validation
- ✅ TypeScript type inference
- ✅ Automatic JSON Schema conversion
- ✅ Clear error messages

### Step 2: Create the Tool Class

```typescript
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';

export class WeatherTool extends BaseTool {
  // 1. Define tool name (must be unique)
  readonly name = 'get_weather';

  // 2. Describe what it does (Claude sees this!)
  readonly description =
    'Gets current weather information for a city. ' +
    'Provides temperature, conditions, and humidity.';

  // 3. Set the input schema
  readonly inputSchema = WeatherInputSchema;

  // 4. Implement the execute method
  async execute(
    input: unknown,
    options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    // Input is already validated by BaseTool!
    const { city, units } = input as WeatherInput;

    try {
      // Your tool logic here
      const weatherData = await this.fetchWeather(city, units);

      return {
        success: true,
        data: weatherData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Helper methods
  private async fetchWeather(city: string, units: string): Promise<any> {
    // Implementation...
  }
}
```

### Step 3: Register the Tool

```typescript
import { createToolRegistry } from './tools/ToolRegistry.js';
import { WeatherTool } from './tools/definitions/WeatherTool.js';

const registry = createToolRegistry();
const weatherTool = new WeatherTool();
registry.register(weatherTool);
```

### Step 4: Use the Tool

```typescript
import { createToolExecutor } from './tools/ToolExecutor.js';

const executor = createToolExecutor(registry);

const result = await executor.executeTool('get_weather', {
  city: 'San Francisco',
  units: 'fahrenheit',
});

console.log(result.data);
```

---

## Tool Best Practices

### 1. Clear Naming

**Good:**
```typescript
readonly name = 'send_email';
readonly name = 'read_file';
readonly name = 'calculate_distance';
```

**Bad:**
```typescript
readonly name = 'SendEmail';  // No uppercase
readonly name = 'do-thing';   // No hyphens
readonly name = 'email';      // Too vague
```

### 2. Descriptive Descriptions

**Good:**
```typescript
readonly description =
  'Sends an email to a recipient. Requires email address, ' +
  'subject, and message body. Returns success status.';
```

**Bad:**
```typescript
readonly description = 'Sends email';  // Too brief
```

### 3. Comprehensive Input Schemas

**Good:**
```typescript
const EmailInputSchema = z.object({
  to: z.string().email({
    description: 'Recipient email address',
  }),
  subject: z.string().min(1, {
    description: 'Email subject line',
  }),
  body: z.string({
    description: 'Email message content',
  }),
  cc: z.array(z.string().email()).optional({
    description: 'CC recipients',
  }),
});
```

**Bad:**
```typescript
const EmailInputSchema = z.object({
  to: z.string(),  // No description, no validation
  subject: z.string(),
  body: z.string(),
});
```

### 4. Detailed Error Messages

**Good:**
```typescript
if (!fileExists(filepath)) {
  return {
    success: false,
    error: `File not found: ${filepath}. Please check the path and try again.`,
    metadata: { filepath },
  };
}
```

**Bad:**
```typescript
return {
  success: false,
  error: 'Error',  // Not helpful!
};
```

### 5. Include Metadata

```typescript
return {
  success: true,
  data: result,
  metadata: {
    executionTime: 123,
    apiVersion: '1.0',
    cached: false,
  },
};
```

---

## Testing Tools

### Manual Testing

Create a test script:

```typescript
// test-my-tool.ts
import { MyTool } from './tools/definitions/MyTool.js';

async function testTool() {
  const tool = new MyTool();

  // Test valid input
  const result1 = await tool.run({ /* valid input */ });
  console.log('Test 1:', result1);

  // Test error handling
  const result2 = await tool.run({ /* invalid input */ });
  console.log('Test 2:', result2);
}

testTool();
```

Run with:
```bash
npm run test-tools
```

### Unit Testing (Future Phase 8)

```typescript
describe('WeatherTool', () => {
  let tool: WeatherTool;

  beforeEach(() => {
    tool = new WeatherTool();
  });

  it('should fetch weather data', async () => {
    const result = await tool.run({
      city: 'London',
      units: 'celsius',
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('temperature');
  });

  it('should handle invalid city', async () => {
    const result = await tool.run({
      city: 'InvalidCity12345',
      units: 'celsius',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
```

---

## Common Patterns

### Pattern 1: API-Based Tools

Tools that call external APIs:

```typescript
export class GitHubTool extends BaseTool {
  readonly name = 'github_search';
  readonly description = 'Search GitHub repositories';
  readonly inputSchema = z.object({
    query: z.string(),
    language: z.string().optional(),
  });

  async execute(input: unknown): Promise<ToolResult> {
    const { query, language } = input as any;

    try {
      // Call GitHub API
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${query}`
      );
      const data = await response.json();

      return {
        success: true,
        data: {
          repositories: data.items.slice(0, 5),
          total_count: data.total_count,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

### Pattern 2: File System Tools

Tools that work with files:

```typescript
import { readFile, writeFile } from 'fs/promises';

export class FileWriterTool extends BaseTool {
  readonly name = 'write_file';
  readonly description = 'Writes content to a file';
  readonly inputSchema = z.object({
    filepath: z.string(),
    content: z.string(),
    overwrite: z.boolean().optional().default(false),
  });

  async execute(input: unknown): Promise<ToolResult> {
    const { filepath, content, overwrite } = input as any;

    try {
      // Check if file exists
      if (!overwrite) {
        try {
          await readFile(filepath);
          return {
            success: false,
            error: 'File already exists. Set overwrite=true to replace.',
          };
        } catch {
          // File doesn't exist, OK to write
        }
      }

      await writeFile(filepath, content, 'utf-8');

      return {
        success: true,
        data: {
          filepath,
          bytesWritten: content.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

### Pattern 3: Composite Tools

Tools that use other tools:

```typescript
export class DataAnalysisTool extends BaseTool {
  readonly name = 'analyze_data';
  readonly description = 'Analyzes data from a file';
  readonly inputSchema = z.object({
    filepath: z.string(),
    operation: z.enum(['sum', 'average', 'max', 'min']),
  });

  constructor(
    private fileReader: FileReaderTool,
    private calculator: CalculatorTool
  ) {
    super();
  }

  async execute(input: unknown): Promise<ToolResult> {
    const { filepath, operation } = input as any;

    // Use FileReaderTool to read data
    const fileResult = await this.fileReader.run({ filepath });
    if (!fileResult.success) {
      return fileResult;
    }

    // Parse data
    const numbers = JSON.parse(fileResult.data as string);

    // Use CalculatorTool for calculations
    // ... perform analysis ...

    return {
      success: true,
      data: { /* results */ },
    };
  }
}
```

---

## Next Steps

1. **Try modifying CalculatorTool** - Add a `power` operation
2. **Create a new tool** - Build a simple tool of your own
3. **Phase 4** - Integrate tools with the agent so Claude can use them

---

## Tool Ideas

Here are some tools you could build for practice:

**Easy:**
- 🎲 **Random Number Generator** - Generate random numbers
- 🔤 **String Manipulator** - Uppercase, lowercase, reverse strings
- 📅 **Date Calculator** - Calculate days between dates

**Medium:**
- 📄 **File System** - Read, write, list files
- 🌐 **HTTP Fetcher** - Make HTTP requests
- 📊 **Data Parser** - Parse CSV, JSON, XML

**Advanced:**
- 🗄️ **Database Tool** - Query SQL databases
- 📧 **Email Tool** - Send emails via SMTP
- 🤖 **AI Tool** - Call another AI model

---

**Questions? Check:**
- `src/tools/definitions/CalculatorTool.ts` - Complete working example
- `src/tools/definitions/BaseTool.ts` - Full API reference
- `src/test-tools.ts` - Testing examples
