# Agent SDK Learning Project - Progress Summary

**Last Updated:** Phase 4 Complete - January 15, 2025

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [What We've Built](#what-weve-built)
- [Phase 1: Foundation](#phase-1-foundation)
- [Phase 2: Core Agent](#phase-2-core-agent)
- [Phase 3: Tool System Foundation](#phase-3-tool-system-foundation)
- [Phase 4: Tool Calling Integration](#phase-4-tool-calling-integration)
- [File Structure](#file-structure)
- [Key Concepts Learned](#key-concepts-learned)
- [How to Use](#how-to-use)
- [What's Next](#whats-next)

---

## 🎯 Project Overview

**Goal:** Build a CLI-based task executor agent using the Anthropic Agent SDK as a learning project, with the foundation to grow into a ChatGPT-like assistant interface.

**Your Role:** Beginner learning TypeScript/Node.js through hands-on development

**Current Status:** ✅ Phase 1-4 Complete | 🔜 Phase 5 Next

**GitHub Repository:** https://github.com/waynefp/agent_test

---

## 🏗️ What We've Built

### Working Features ✅

1. **Interactive Chat Interface**
   - Talk to Claude in your terminal
   - Multi-turn conversations with full context
   - Commands: `/help`, `/clear`, `/history`, `/stats`, `/exit`

2. **Conversation Memory**
   - Remembers entire conversation history
   - Claude can reference previous messages
   - Token usage tracking

3. **Beautiful CLI Output**
   - Color-coded messages (User: Blue, Assistant: Green)
   - Formatted display with timestamps
   - Real-time token usage statistics

4. **Robust Error Handling**
   - Graceful failures with helpful messages
   - Environment validation
   - API error handling

5. **Tool System (NEW in Phase 3-4)**
   - Extensible tool architecture with `BaseTool` class
   - `CalculatorTool` for math operations (add, subtract, multiply, divide)
   - `ToolRegistry` for managing available tools
   - `ToolExecutor` for running tools safely
   - Zod schema validation for tool inputs

6. **Agentic Loop (NEW in Phase 4)**
   - Claude can autonomously decide when to use tools
   - Multi-turn tool interactions
   - Tool results sent back to Claude for reasoning
   - Configurable max turns to prevent infinite loops

---

## 📦 Phase 1: Foundation

**Completed:** January 14, 2025
**Goal:** Set up the project infrastructure

### What We Built

#### 1. Project Setup
- **package.json** - Dependencies and scripts
- **tsconfig.json** - TypeScript strict mode configuration
- **.env** - Secure API key storage
- **.gitignore** - Protect sensitive files

#### 2. Folder Structure
```
Agent_SDK-Test/
├── src/                    # All source code
│   ├── agent/             # Agent logic
│   ├── tools/             # Tool definitions (Phase 3+)
│   ├── types/             # TypeScript interfaces
│   ├── config/            # Configuration files
│   ├── utils/             # Utility functions
│   └── cli/               # CLI interface
├── data/                  # Persistent data storage
│   ├── conversations/     # Saved conversations
│   └── tasks/             # Task tracking data
├── tests/                 # All tests
├── examples/              # Learning examples
└── docs/                  # Documentation
```

#### 3. Type System (src/types/)
Created comprehensive TypeScript definitions:
- **tool.types.ts** - Tool interfaces and result types
- **conversation.types.ts** - Message and conversation structures
- **task.types.ts** - Task tracking types
- **agent.types.ts** - Agent configuration and state

#### 4. Configuration (src/config/)
- **environment.ts** - Environment variable management
  - Validates required variables (API key)
  - Provides defaults for optional settings
  - Type-safe configuration access

#### 5. Utilities (src/utils/)
- **logger.ts** - Colorful console logging
  - Different levels: debug, info, warn, error
  - Special loggers for tools, agents, tasks
- **errors.ts** - Custom error classes
  - Better error handling and debugging

### Key Files Created (Phase 1)
```
✅ package.json
✅ tsconfig.json
✅ .env.example
✅ .env
✅ .gitignore
✅ src/types/tool.types.ts
✅ src/types/conversation.types.ts
✅ src/types/task.types.ts
✅ src/types/agent.types.ts
✅ src/types/index.ts
✅ src/config/environment.ts
✅ src/utils/logger.ts
✅ src/utils/errors.ts
```

### What You Learned (Phase 1)

**TypeScript Fundamentals:**
- `interface` vs `type` - Defining data structures
- Strict type checking - Catching errors early
- Path aliases - Cleaner imports (`@/config/environment`)
- Generics and unions - Flexible type definitions

**Node.js Basics:**
- ES modules - Modern `import/export`
- Environment variables - Secure configuration
- File structure - Organizing code logically
- `package.json` - Project configuration

**Development Tools:**
- `npm` - Package management
- `tsx` - Running TypeScript directly (no build step)
- TypeScript compiler - Type checking and compilation

---

## 🤖 Phase 2: Core Agent

**Completed:** January 14, 2025
**Goal:** Build a working conversational agent

### What We Built

#### 1. Anthropic Client Configuration (src/config/anthropic.config.ts)
- **Purpose:** Setup connection to Claude's API
- **Features:**
  - Singleton client instance (reuse connection)
  - Default configuration with sensible defaults
  - Model validation
  - Helper functions for API requests

#### 2. Conversation Manager (src/agent/ConversationManager.ts)
- **Purpose:** Manage conversation history (the agent's "memory")
- **Features:**
  - Store messages in memory
  - Add user and assistant messages
  - Convert to Anthropic API format
  - Get conversation summary and statistics
  - Clear history

**Key Methods:**
```typescript
addTextMessage(role, text)     // Add a message
getMessages()                   // Get all messages
toAnthropicFormat()            // Convert for API
clearMessages()                // Start fresh
```

#### 3. Agent Class (src/agent/Agent.ts)
- **Purpose:** The "brain" that orchestrates everything
- **Features:**
  - Send messages to Claude
  - Maintain conversation state
  - Track token usage
  - Handle errors gracefully

**Key Methods:**
```typescript
chat(message)                  // Send a message, get response
getConversationHistory()       // View past messages
clearConversation()            // Reset memory
getState()                     // View statistics
updateConfig(config)           // Change settings
```

#### 4. CLI Interface (src/cli/)

**display.ts** - Terminal output formatting:
- Colored messages (user, assistant, system, error)
- Welcome screen and help text
- Statistics display
- Conversation history display

**prompts.ts** - User input handling:
- Get messages from user
- Confirmation dialogs
- Option selection menus

**commands.ts** - Interactive chat loop:
- Main chat session
- Command handling (`/help`, `/clear`, etc.)
- Error recovery

#### 5. Main Entry Point (src/index.ts)
- Validates environment
- Creates agent
- Starts interactive chat session

#### 6. Test Script (src/test-agent.ts)
- Automated testing without user interaction
- Runs sample conversation
- Verifies conversation memory
- Shows statistics

### Key Files Created (Phase 2)
```
✅ src/config/anthropic.config.ts
✅ src/agent/ConversationManager.ts
✅ src/agent/Agent.ts
✅ src/cli/display.ts
✅ src/cli/prompts.ts
✅ src/cli/commands.ts
✅ src/index.ts (updated)
✅ src/test-agent.ts
```

### What You Learned (Phase 2)

**API Integration:**
- Making HTTP requests to external APIs
- Handling async operations with `async/await`
- Error handling for network failures
- Request/response formatting

**State Management:**
- Maintaining conversation state
- Updating state immutably
- Managing complex object relationships

**Design Patterns:**
- **Singleton Pattern** - One client instance
- **Factory Pattern** - `createAgent()` function
- **Separation of Concerns** - Each class has one responsibility
- **Dependency Injection** - Pass dependencies to constructors

**CLI Development:**
- Using `inquirer` for interactive prompts
- Using `chalk` for colored output
- Building command systems
- Handling user input and validation

**TypeScript Advanced:**
- Type guards (`isToolResult()`)
- Union types (`MessageContent`)
- Generic functions
- Type inference and assertions

---

## 🔧 Phase 3: Tool System Foundation

**Completed:** January 15, 2025
**Goal:** Build an extensible tool architecture

### What We Built

#### 1. BaseTool Abstract Class (src/tools/definitions/BaseTool.ts)
- **Purpose:** Template for all tools to inherit from
- **Features:**
  - Abstract methods: `name`, `description`, `inputSchema`, `execute()`
  - Built-in input validation using Zod schemas
  - Safe execution with `run()` method (validates → executes → handles errors)
  - Timeout support for long-running operations
  - Automatic conversion to Anthropic API format

**Key Methods:**
```typescript
validate(input)           // Validate input against schema
execute(input, options)   // Abstract - implement your logic
run(input, options)       // Safe wrapper with validation & timing
toAnthropicFormat()       // Convert to Claude's tool format
```

#### 2. CalculatorTool (src/tools/definitions/CalculatorTool.ts)
- **Purpose:** Example tool demonstrating the pattern
- **Operations:** add, subtract, multiply, divide
- **Features:**
  - Zod schema validation for inputs
  - Division by zero handling
  - Human-readable expression output

#### 3. ToolRegistry (src/tools/ToolRegistry.ts)
- **Purpose:** Central registry to manage all tools
- **Features:**
  - Register/unregister tools
  - Tool name validation (lowercase, alphanumeric, underscores)
  - Singleton or instance-based usage
  - Bulk tool registration with `registerMany()`
  - Convert all tools to Anthropic format

**Key Methods:**
```typescript
register(tool)            // Add a tool
unregister(toolName)      // Remove a tool
getTool(toolName)         // Retrieve a tool
getAllTools()             // Get all tools
toAnthropicFormat()       // Convert all for Claude
```

### Key Files Created (Phase 3)
```
✅ src/tools/definitions/BaseTool.ts
✅ src/tools/definitions/CalculatorTool.ts
✅ src/tools/definitions/index.ts
✅ src/tools/ToolRegistry.ts
✅ docs/TOOLS.md
```

### What You Learned (Phase 3)

**Object-Oriented Programming:**
- Abstract classes and inheritance
- The `extends` keyword
- Implementing abstract methods
- Protected vs private vs public members

**Design Patterns:**
- **Strategy Pattern** - Tools implement a common interface
- **Registry Pattern** - Central place to manage tools
- **Template Method Pattern** - BaseTool defines the workflow

**Zod Validation:**
- Defining schemas with `z.object()`, `z.enum()`, `z.number()`
- Optional fields with `.optional()` and `.default()`
- Type inference with `z.infer<typeof Schema>`
- Converting Zod to JSON Schema for APIs

---

## 🔗 Phase 4: Tool Calling Integration

**Completed:** January 15, 2025
**Goal:** Enable Claude to autonomously use tools

### What We Built

#### 1. ToolExecutor (src/tools/ToolExecutor.ts)
- **Purpose:** Execute tools by name with proper error handling
- **Features:**
  - Look up tools from registry
  - Execute with metadata tracking
  - Sequential execution with `executeMany()`
  - Parallel execution with `executeManyParallel()`

**Key Methods:**
```typescript
executeTool(name, input)           // Run a single tool
executeToolWithMetadata(...)       // Run with tracking info
executeMany(toolCalls)             // Run sequentially
executeManyParallel(toolCalls)     // Run in parallel
```

#### 2. Agent with Agentic Loop (src/agent/Agent.ts - Updated)
- **Purpose:** Allow Claude to autonomously decide when to use tools
- **The Agentic Loop:**
  1. User sends message
  2. Agent sends to Claude (with available tools)
  3. Claude decides: respond OR use a tool
  4. If tool_use: Execute tool → Send result back → Go to step 3
  5. If end_turn: Return final response to user

**New Agent Features:**
- `registerTool(tool)` - Add tools at runtime
- `getAvailableTools()` - List registered tools
- `getToolStats()` - Track tool usage
- Tool results stored in conversation history
- Max turns limit to prevent infinite loops

#### 3. ConversationManager Updates (src/agent/ConversationManager.ts)
- **New Method:** `addToolResult(toolUseId, content, isError)`
- Properly formats tool results for Anthropic API
- Tracks tool use blocks in conversation

#### 4. Test Script (src/test-tools.ts)
- Tests tool execution directly
- Tests agent with tools end-to-end
- Verifies agentic loop behavior

### Key Files Created/Updated (Phase 4)
```
✅ src/tools/ToolExecutor.ts (new)
✅ src/agent/Agent.ts (updated with agentic loop)
✅ src/agent/ConversationManager.ts (updated)
✅ src/test-tools.ts (new)
```

### What You Learned (Phase 4)

**The Agentic Loop:**
- Understanding stop reasons (`end_turn`, `tool_use`, `max_tokens`)
- Looping until Claude gives a final response
- Handling multiple tool calls in one turn
- Preventing infinite loops with max turns

**API Concepts:**
- Tool definitions in Anthropic format
- Content blocks (`text`, `tool_use`, `tool_result`)
- Message roles and tool result formatting

**Advanced TypeScript:**
- Type guards for content blocks
- Async iteration patterns
- Error propagation and handling

**State Management:**
- Tracking tool call counts
- Managing conversation with tool results
- Immutable state updates

---

## 📁 File Structure (Detailed)

### Source Code (src/)

```
src/
├── index.ts                      # Main entry point (starts chat)
├── test-agent.ts                 # Automated test script
├── test-tools.ts                 # Tool testing script
│
├── agent/                        # Agent logic
│   ├── Agent.ts                  # Core agent class (with agentic loop)
│   └── ConversationManager.ts    # Message history management
│
├── tools/                        # Tool system ✅
│   ├── ToolRegistry.ts           # Tool management
│   ├── ToolExecutor.ts           # Tool execution
│   └── definitions/              # Individual tools
│       ├── BaseTool.ts           # Abstract base class
│       ├── CalculatorTool.ts     # Math operations
│       └── index.ts              # Re-exports
│
├── types/                        # TypeScript definitions
│   ├── tool.types.ts             # Tool-related types
│   ├── conversation.types.ts     # Message and conversation types
│   ├── task.types.ts             # Task tracking types
│   ├── agent.types.ts            # Agent configuration types
│   └── index.ts                  # Re-export all types
│
├── config/                       # Configuration
│   ├── environment.ts            # Environment variable handling
│   └── anthropic.config.ts       # Anthropic SDK setup
│
├── utils/                        # Utilities
│   ├── logger.ts                 # Colorful console logging
│   └── errors.ts                 # Custom error classes
│
└── cli/                          # CLI interface
    ├── display.ts                # Terminal output formatting
    ├── prompts.ts                # User input handling
    └── commands.ts               # Command execution & chat loop
```

### Configuration Files (Root)

```
Agent_SDK-Test/
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── .env                          # Environment variables (NOT in git)
├── .env.example                  # Template for .env
├── .gitignore                    # Files to ignore in git
└── PROJECT_SUMMARY.md           # This file!
```

### Data Storage (data/)

```
data/
├── conversations/               # Saved conversation JSON files
│   └── .gitkeep                # (Future: Phase 6)
└── tasks/                       # Task tracking JSON files
    └── .gitkeep                # (Future: Phase 5)
```

---

## 🧠 Key Concepts Learned

### TypeScript

**Type Safety:**
```typescript
// Instead of any type, we define exact shapes
interface Message {
  role: 'user' | 'assistant';
  content: MessageContent[];
  timestamp: Date;
}

// TypeScript catches errors BEFORE runtime
const msg: Message = {
  role: 'user',
  content: [{ type: 'text', text: 'Hello' }],
  timestamp: new Date()
};
```

**Interfaces vs Types:**
- `interface` - For object shapes, can be extended
- `type` - For unions, intersections, aliases

**Path Aliases:**
```typescript
// Instead of: import { logger } from '../../../utils/logger';
// We write:    import { logger } from '@utils/logger';
```

### Async/Await

**Understanding Asynchronous Code:**
```typescript
// async functions return Promises
async function chat(message: string): Promise<string> {
  // await pauses execution until Promise resolves
  const response = await client.messages.create({...});
  return response.content[0].text;
}

// Call async functions with await
const reply = await agent.chat('Hello');
```

### API Integration

**Making API Calls:**
```typescript
// 1. Create client
const client = new Anthropic({ apiKey: API_KEY });

// 2. Prepare request
const params = {
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 2048,
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
};

// 3. Send request and get response
const response = await client.messages.create(params);

// 4. Extract data
const text = response.content[0].text;
```

### Design Patterns

**Singleton Pattern:**
```typescript
// Only create one instance, reuse it everywhere
let clientInstance: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!clientInstance) {
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}
```

**Factory Pattern:**
```typescript
// Use a function to create objects
export function createAgent(config?: Partial<AgentConfig>): Agent {
  return new Agent(config);
}

// Cleaner than: new Agent(config)
const agent = createAgent({ temperature: 0.7 });
```

**Separation of Concerns:**
- **Agent.ts** - Orchestrates everything
- **ConversationManager.ts** - ONLY manages messages
- **AnthropicClient** - ONLY talks to API
- Each class has ONE clear responsibility

### Error Handling

**Try/Catch Pattern:**
```typescript
try {
  const response = await agent.chat(message);
  displayAssistantMessage(response);
} catch (error) {
  displayError(getErrorMessage(error));
  // Gracefully recover or ask user what to do
}
```

**Custom Errors:**
```typescript
// Instead of generic Error, create specific types
class ToolExecutionError extends Error {
  constructor(public toolName: string, public cause: Error) {
    super(`Tool ${toolName} failed: ${cause.message}`);
  }
}

// Now you can catch specific error types
catch (error) {
  if (error instanceof ToolExecutionError) {
    // Handle tool errors specially
  }
}
```

---

## 🚀 How to Use

### Setup (One-time)

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**
   - Edit `.env` file
   - Add your Anthropic API key:
     ```
     ANTHROPIC_API_KEY=sk-ant-your-key-here
     ```

### Running the Agent

**Interactive Chat (Main Usage):**
```bash
npm run dev
```
- Opens an interactive chat session
- Type messages and press Enter
- Use commands like `/help`, `/history`, `/stats`
- Type `/exit` to quit

**Automated Test:**
```bash
npm run test-agent
```
- Runs a scripted 2-question conversation
- Verifies everything works
- Shows token usage and statistics

**Build for Production:**
```bash
npm run build      # Compile TypeScript to JavaScript
npm start          # Run compiled code
```

### Available Commands (In Chat)

| Command | Description |
|---------|-------------|
| `/help` | Show help message with all commands |
| `/clear` | Clear conversation history (start fresh) |
| `/history` | Display full conversation history |
| `/stats` | Show statistics (messages, tokens, etc.) |
| `/exit` or `/quit` | Exit the chat session |

### Configuration Options

**Environment Variables (.env):**
```bash
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional (have defaults)
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
MAX_TOKENS=2048
LOG_LEVEL=info    # debug | info | warn | error
```

**Agent Configuration (in code):**
```typescript
const agent = createAgent({
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 2048,
  temperature: 1.0,  // 0.0 = focused, 1.0 = creative
  systemPrompt: 'You are a helpful assistant...'
});
```

---

## 🎯 What's Next

### Upcoming Phases

#### Phase 5: Task Tracking (Days 11-12) 🔜 NEXT
**Goal:** Track what the agent is working on

**What We'll Build:**
- `TaskTracker` class
- Hierarchical task structure (tasks with subtasks)
- Task persistence to JSON files
- CLI commands for task management

**What You'll Learn:**
- Hierarchical data structures
- File I/O in Node.js
- State management with persistence
- Tree data structures

#### Phase 6: Conversation Persistence (Days 13-14)
**Goal:** Save and load conversations

**What We'll Build:**
- Enhanced ConversationManager with JSON export
- Load previous conversations
- Conversation search and filtering
- CLI commands for managing saved chats

**What You'll Learn:**
- JSON serialization/deserialization
- File system operations
- Data persistence patterns
- Search and filter algorithms

#### Phase 7: Enhanced CLI & UX (Days 15-16)
**Goal:** Professional user experience

**What We'll Build:**
- Better prompts with `inquirer`
- Loading spinners with `ora`
- Syntax highlighting for code
- Comprehensive help system

**What You'll Learn:**
- CLI UX best practices
- User feedback patterns
- Terminal capabilities

#### Phase 8: Testing & Documentation (Days 17-18)
**Goal:** Production-quality code

**What We'll Build:**
- Unit tests with Jest
- Integration tests
- Complete documentation
- Example scripts

**What You'll Learn:**
- Testing strategies
- Test-driven development
- Documentation best practices
- Creating good examples

---

## 📊 Progress Tracker

| Phase | Status | Completion Date | Key Deliverable |
|-------|--------|----------------|-----------------|
| Phase 1: Foundation | ✅ Complete | Jan 14, 2025 | Project setup, types, utils |
| Phase 2: Core Agent | ✅ Complete | Jan 14, 2025 | Working conversational agent |
| Phase 3: Tool Foundation | ✅ Complete | Jan 15, 2025 | BaseTool, CalculatorTool, ToolRegistry |
| Phase 4: Tool Integration | ✅ Complete | Jan 15, 2025 | Agentic loop, ToolExecutor |
| Phase 5: Task Tracking | 🔜 Next | - | TaskTracker, task persistence |
| Phase 6: Persistence | ⏳ Pending | - | Save/load conversations |
| Phase 7: Enhanced UX | ⏳ Pending | - | Better CLI experience |
| Phase 8: Testing & Docs | ⏳ Pending | - | Tests, documentation |

---

## 📚 Additional Resources

### Documentation (To Be Created)

- `docs/GETTING_STARTED.md` - Step-by-step tutorial
- `docs/ARCHITECTURE.md` - System design explanation
- `docs/TOOLS.md` - How to create custom tools
- `docs/CONCEPTS.md` - Core SDK concepts explained

### Official Resources

- [Anthropic SDK Documentation](https://docs.anthropic.com/en/api/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Node.js Documentation](https://nodejs.org/docs/latest/api/)

---

## 🎓 Skills Gained So Far

### Technical Skills
- ✅ TypeScript fundamentals (types, interfaces, generics)
- ✅ Node.js development (ES modules, async/await)
- ✅ API integration (REST APIs, error handling)
- ✅ State management (conversation history)
- ✅ CLI development (inquirer, chalk)
- ✅ Error handling patterns
- ✅ Project structure and organization
- ✅ Abstract classes and inheritance (Phase 3)
- ✅ Zod schema validation (Phase 3)
- ✅ The agentic loop pattern (Phase 4)
- ✅ Tool calling in Claude's API (Phase 4)

### Software Engineering Concepts
- ✅ Separation of concerns
- ✅ Single responsibility principle
- ✅ Factory pattern
- ✅ Singleton pattern
- ✅ Type safety and validation
- ✅ Environment configuration
- ✅ Logging and debugging
- ✅ Strategy pattern (Phase 3)
- ✅ Registry pattern (Phase 3)
- ✅ Template method pattern (Phase 3)

### Tools & Technologies
- ✅ npm (package management)
- ✅ TypeScript compiler
- ✅ tsx (TypeScript execution)
- ✅ Git (version control)
- ✅ Anthropic SDK
- ✅ Terminal/CLI tools
- ✅ Zod (runtime validation)

---

## 💡 Key Takeaways

### What Makes This Project Special

1. **Learning-Focused:** Every file has beginner-friendly comments explaining concepts
2. **Type-Safe:** Strict TypeScript catches errors before runtime
3. **Well-Structured:** Clean separation of concerns makes code easy to understand
4. **Production-Ready Patterns:** Using industry-standard design patterns
5. **Extensible:** Built with future features in mind (tools, tasks, etc.)

### Best Practices Applied

- **Environment Variables:** Never hardcode API keys
- **Error Handling:** Graceful failures with helpful messages
- **Type Safety:** Catch bugs early with TypeScript
- **Logging:** Track what's happening for debugging
- **Documentation:** Comments explain WHY, not just WHAT
- **Git Ignore:** Protect sensitive files (.env, API keys)

---

## 🤔 Common Questions

**Q: Why use TypeScript instead of JavaScript?**
A: TypeScript catches errors BEFORE you run your code. It's like having a safety net that prevents bugs.

**Q: What's the difference between our Agent and ChatGPT?**
A: Similar concept! ChatGPT is a web interface to GPT models. We're building a CLI interface to Claude. Both are conversational AI agents.

**Q: How much do API calls cost?**
A: Claude Sonnet costs ~$3 per million input tokens, ~$15 per million output tokens. Our test used 125 tokens (≈$0.001 or 1/10th of a cent).

**Q: Can I use this agent in my own projects?**
A: Absolutely! That's the goal. Learn here, then adapt the patterns for your own use cases.

**Q: Why so many files instead of one big file?**
A: Separation of concerns. Each file has one job, making code easier to understand, test, and maintain.

---

**Last Updated:** Phase 4 Complete - January 15, 2025
**Next Update:** After Phase 5 (Task Tracking)
