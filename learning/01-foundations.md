# 01 - Project Foundations

**Phase:** 1
**Goal:** Set up a proper TypeScript project for agent development
**Time to Complete:** 1-2 hours for a new project

---

## What You'll Learn

- How to structure an agent project
- TypeScript essentials for agent development
- Environment configuration and security
- Type definitions for agents and tools

---

## 1. Project Structure

A well-organized agent project separates concerns into logical folders:

```
my-agent/
├── src/                    # Source code
│   ├── agent/             # Agent logic (brain)
│   ├── tools/             # Tool definitions (capabilities)
│   ├── types/             # TypeScript interfaces
│   ├── config/            # Configuration
│   ├── utils/             # Utilities (logging, errors)
│   └── cli/               # User interface
├── data/                  # Persistent storage
├── tests/                 # Test files
├── .env                   # Secrets (never commit!)
├── .env.example           # Template for secrets
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

### Why This Structure?

| Folder | Purpose | Example Files |
|--------|---------|---------------|
| `agent/` | Core agent logic | Agent.ts, ConversationManager.ts |
| `tools/` | Things the agent can do | CalculatorTool.ts, FileSystemTool.ts |
| `types/` | TypeScript definitions | tool.types.ts, agent.types.ts |
| `config/` | Settings and setup | environment.ts, anthropic.config.ts |
| `utils/` | Shared utilities | logger.ts, errors.ts |
| `cli/` | User interaction | display.ts, prompts.ts |

---

## 2. Essential Configuration Files

### package.json

```json
{
  "name": "my-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.38.0",
    "zod": "^3.25.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tsx": "^4.19.0",
    "@types/node": "^20.0.0"
  }
}
```

**Key Points:**
- `"type": "module"` - Use modern ES modules (import/export)
- `tsx` - Run TypeScript directly without compiling
- `zod` - Runtime validation for tool inputs
- `dotenv` - Load environment variables from .env file

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@agent/*": ["./agent/*"],
      "@tools/*": ["./tools/*"],
      "@types/*": ["./types/*"],
      "@config/*": ["./config/*"],
      "@utils/*": ["./utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key Points:**
- `"strict": true` - Catch errors at compile time
- `paths` - Allow clean imports like `@config/environment`

### .env and .env.example

**.env** (your actual secrets - NEVER commit this):
```bash
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

**.env.example** (template for others - safe to commit):
```bash
# Get your API key from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional settings
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
MAX_TOKENS=2048
LOG_LEVEL=info
```

### .gitignore

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Secrets - NEVER commit!
.env
.env.local

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
```

---

## 3. TypeScript Essentials

### Interfaces vs Types

```typescript
// INTERFACE - Best for object shapes, can be extended
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Extended interface
interface MessageWithMetadata extends Message {
  tokens: number;
}

// TYPE - Best for unions, aliases, computed types
type Role = "user" | "assistant" | "system";
type MessageContent = string | ContentBlock[];
type ToolResult = { success: true; data: any } | { success: false; error: string };
```

**Rule of Thumb:**
- Use `interface` for objects you might extend
- Use `type` for unions, aliases, or complex computed types

### Generics

Generics let you write flexible, reusable code:

```typescript
// A result that can contain any type of data
interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Usage
const numberResult: Result<number> = { success: true, data: 42 };
const stringResult: Result<string> = { success: true, data: "hello" };

// Generic function
function wrapInResult<T>(value: T): Result<T> {
  return { success: true, data: value };
}
```

### Async/Await

All API calls are asynchronous:

```typescript
// async function returns a Promise
async function fetchData(): Promise<string> {
  // await pauses until the Promise resolves
  const response = await fetch("https://api.example.com/data");
  const data = await response.json();
  return data.message;
}

// Calling async functions
async function main() {
  try {
    const message = await fetchData();
    console.log(message);
  } catch (error) {
    console.error("Failed:", error);
  }
}
```

### Type Guards

Type guards help TypeScript understand types at runtime:

```typescript
// Content can be text or tool_use
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown };

// Type guard function
function isTextBlock(block: ContentBlock): block is { type: "text"; text: string } {
  return block.type === "text";
}

// Usage
function extractText(blocks: ContentBlock[]): string {
  const textBlock = blocks.find(isTextBlock);
  return textBlock ? textBlock.text : "";
}
```

---

## 4. Environment Configuration

### environment.ts

```typescript
// src/config/environment.ts
import "dotenv/config";

interface EnvironmentConfig {
  anthropicApiKey: string;
  model: string;
  maxTokens: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

function loadEnvironment(): EnvironmentConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required. " +
      "Get one at https://console.anthropic.com/"
    );
  }

  return {
    anthropicApiKey: apiKey,
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
    maxTokens: parseInt(process.env.MAX_TOKENS || "2048", 10),
    logLevel: (process.env.LOG_LEVEL as EnvironmentConfig["logLevel"]) || "info",
  };
}

// Export singleton config
export const env = loadEnvironment();
```

**Key Points:**
- Validate required variables early (fail fast)
- Provide sensible defaults for optional settings
- Use TypeScript to ensure type safety

---

## 5. Utility Functions

### Logger (src/utils/logger.ts)

```typescript
import chalk from "chalk";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: number;

  constructor(level: LogLevel = "info") {
    this.minLevel = LOG_LEVELS[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  debug(message: string, ...args: unknown[]) {
    if (this.shouldLog("debug")) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: unknown[]) {
    if (this.shouldLog("info")) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  warn(message: string, ...args: unknown[]) {
    if (this.shouldLog("warn")) {
      console.log(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message: string, ...args: unknown[]) {
    if (this.shouldLog("error")) {
      console.log(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }
}

export const logger = new Logger();
```

### Custom Errors (src/utils/errors.ts)

```typescript
// Base error for all agent-related errors
export class AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentError";
  }
}

// Specific error types
export class ConfigurationError extends AgentError {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class ToolExecutionError extends AgentError {
  constructor(
    public toolName: string,
    public cause: Error
  ) {
    super(`Tool '${toolName}' failed: ${cause.message}`);
    this.name = "ToolExecutionError";
  }
}

// Helper to extract error message from unknown
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}
```

---

## 6. Type Definitions

### tool.types.ts

```typescript
// Result of executing a tool
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    executionTime?: number;
    toolName?: string;
  };
}

// Options passed to tool execution
export interface ToolExecutionOptions {
  timeout?: number;
  context?: Record<string, unknown>;
}

// A tool call from Claude
export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}
```

### conversation.types.ts

```typescript
// A single piece of content in a message
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

// A message in the conversation
export interface Message {
  role: "user" | "assistant";
  content: ContentBlock[];
  timestamp: Date;
}

// Full conversation state
export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
```

### agent.types.ts

```typescript
// Configuration for creating an agent
export interface AgentConfig {
  model: string;
  maxTokens: number;
  temperature?: number;
  systemPrompt?: string;
  maxTurns?: number;  // Prevent infinite loops
}

// Current state of the agent
export interface AgentState {
  conversationId: string;
  messageCount: number;
  totalTokensUsed: number;
  toolCallCount: number;
}
```

---

## Quick Start: New Project Checklist

```bash
# 1. Create project folder
mkdir my-agent && cd my-agent

# 2. Initialize npm
npm init -y

# 3. Install dependencies
npm install @anthropic-ai/sdk zod dotenv chalk
npm install -D typescript tsx @types/node

# 4. Create tsconfig.json (copy from above)

# 5. Create folder structure
mkdir -p src/{agent,tools,types,config,utils,cli} data tests

# 6. Create .env with your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key" > .env

# 7. Create .gitignore (copy from above)

# 8. Add scripts to package.json:
#    "dev": "tsx src/index.ts"
```

---

## Exercises

### Exercise 1: Environment Validation
Create an environment.ts that:
1. Requires ANTHROPIC_API_KEY
2. Has optional MODEL with default "claude-sonnet-4-5-20250929"
3. Has optional TEMPERATURE with default 1.0 (validate it's 0-2)

### Exercise 2: Custom Error
Create a `RateLimitError` class that:
1. Extends AgentError
2. Includes a `retryAfter` property (seconds to wait)
3. Has a helpful message

### Exercise 3: Type Definition
Define types for a "task" that has:
1. id (string)
2. title (string)
3. status (one of: pending, in_progress, completed, failed)
4. createdAt (Date)
5. completedAt (optional Date)

<details>
<summary>Exercise 1 Solution</summary>

```typescript
import "dotenv/config";

interface EnvironmentConfig {
  anthropicApiKey: string;
  model: string;
  temperature: number;
}

function loadEnvironment(): EnvironmentConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }

  const temperature = parseFloat(process.env.TEMPERATURE || "1.0");
  if (temperature < 0 || temperature > 2) {
    throw new Error("TEMPERATURE must be between 0 and 2");
  }

  return {
    anthropicApiKey: apiKey,
    model: process.env.MODEL || "claude-sonnet-4-5-20250929",
    temperature,
  };
}

export const env = loadEnvironment();
```
</details>

<details>
<summary>Exercise 2 Solution</summary>

```typescript
export class RateLimitError extends AgentError {
  constructor(public retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter} seconds.`);
    this.name = "RateLimitError";
  }
}
```
</details>

<details>
<summary>Exercise 3 Solution</summary>

```typescript
type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: Date;
  completedAt?: Date;  // Optional - only set when completed
}
```
</details>

---

## Key Takeaways

1. **Structure matters** - Organize code by responsibility, not by file type
2. **Type everything** - TypeScript catches bugs before runtime
3. **Secure your secrets** - Never commit API keys
4. **Fail fast** - Validate configuration at startup
5. **Log wisely** - Use log levels to control verbosity

---

**Next:** [02-core-agent.md](./02-core-agent.md) - Building the conversational agent
