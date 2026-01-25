# Agent SDK Learning Project - Progress Summary

**Last Updated:** Phase 9 Complete - January 25, 2025

## 📋 Table of Contents
- [Project Purpose](#project-purpose)
- [Complete Roadmap](#complete-roadmap)
- [Project Overview](#project-overview)
- [What We've Built](#what-weve-built)
- [Phase 1: Foundation](#phase-1-foundation)
- [Phase 2: Core Agent](#phase-2-core-agent)
- [Phase 3: Tool System Foundation](#phase-3-tool-system-foundation)
- [Phase 4: Tool Calling Integration](#phase-4-tool-calling-integration)
- [Phase 5: Tool System Completion](#phase-5-tool-system-completion)
- [File Structure](#file-structure)
- [Key Concepts Learned](#key-concepts-learned)
- [How to Use](#how-to-use)
- [Future Phases](#future-phases)
- [Learning Guide](#learning-guide)

---

## 🗺️ Complete Roadmap

This project follows a structured 12-phase learning journey for building AI agents.

### Phase Overview

| Phase | Focus | Status | Key Learning |
|-------|-------|--------|--------------|
| 1 | Foundation | ✅ Complete | Project setup, TypeScript, configuration |
| 2 | Core Agent | ✅ Complete | Anthropic API, conversations, basic agent |
| 3 | Tool System | ✅ Complete | Tool architecture, schemas, registry |
| 4 | Agentic Loop | ✅ Complete | Autonomous tool use, the loop pattern |
| 5 | Tool Completion | ✅ Complete | Polish tools, design patterns, security |
| 6 | Streaming | ✅ Complete | Real-time responses, SSE, async patterns |
| 7 | System Prompts | ✅ Complete | Agent behavior, prompt engineering |
| 8 | Context Management | ✅ Complete | Token limits, summarization, cost optimization |
| 9 | Persistence | ✅ Complete | Save/load conversations, session management |
| 10 | Memory & Web Search | 🔄 Current | Long-term memory, external APIs |
| 11 | Production Readiness | ⏳ Pending | Error handling, retries, testing |
| 12 | Vision & Multi-modal | ⏳ Pending | Image processing, multi-modal inputs |

### Future Phases (Documented, Not Detailed)
- Multi-agent patterns
- Structured output / JSON mode
- Advanced orchestration

---

## 🎯 Project Purpose

> **IMPORTANT: This is a learning project for building an AI agent using the Anthropic Agent SDK.**

### Core Objective
Build a personalized CLI-based assistant (similar to Claude or ChatGPT) by incrementally adding capabilities through **tools**. Each phase adds new abilities to the agent, teaching SDK concepts along the way.

### The Learning Approach
1. **Start simple** - Basic conversational agent
2. **Add tools one at a time** - Each tool teaches new concepts
3. **Agent decides when to use tools** - The "agentic loop" pattern
4. **Build toward a full assistant** - File access, task tracking, web search, and more

### What This Is NOT
- This is NOT just a CLI task manager
- This is NOT about building separate features outside the agent
- Every capability should be **a tool the agent can use autonomously**

### The Vision
A personalized assistant that can:
- Have conversations and remember context
- Perform calculations when needed
- Read and write files in a workspace
- Track tasks and projects
- Search the web for information
- (Future) Run code, access APIs, remember facts about you

Each feature is implemented as a **tool** that the agent decides when to use.

---

## 🎯 Project Overview

**Goal:** Build a CLI-based assistant using the Anthropic Agent SDK as a learning project, growing into a ChatGPT-like interface with custom tools.

**Your Role:** Beginner learning TypeScript/Node.js through hands-on development

**Current Status:** ✅ Phase 1-9 Complete | 🔄 Phase 10 (Memory & Web Search) Next

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

5. **Tool System (Phase 3-4)**
   - Extensible tool architecture with `BaseTool` class
   - `ToolRegistry` for managing available tools
   - `ToolExecutor` for running tools safely
   - Zod schema validation for tool inputs

6. **Agentic Loop (Phase 4)**
   - Claude autonomously decides when to use tools
   - Multi-turn tool interactions
   - Tool results sent back to Claude for reasoning
   - Configurable max turns to prevent infinite loops

7. **Agent Tools (Phase 5 - Current)**
   - `CalculatorTool` - Math operations (add, subtract, multiply, divide)
   - `FileSystemTool` - Read/write files in sandboxed workspace
   - `TaskTool` - Create and track tasks with the agent
   - `WebSearchTool` - Search the web via DuckDuckGo API

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

## 🛠️ Phase 5: Tool System Completion

**Started:** January 19, 2025
**Status:** In Progress (Consolidation)
**Goal:** Complete the tool system with polished, production-quality tools

### Learning Objectives

- Tool design best practices (input validation, error handling, security)
- Sandboxing and safety patterns
- When to use tools vs. direct responses

### The Key Insight

Phase 5 is about making the agent **useful** with well-designed tools. Instead of just chatting, the agent can now:
- Access files (sandboxed for security)
- Track tasks (with persistence)
- Do calculations (accurate math)

**Important:** Each capability is a **tool the agent decides to use**, not a separate CLI feature.

### Tools (Final Set for Phase 5)

#### 1. CalculatorTool (src/tools/definitions/CalculatorTool.ts)
- **Purpose:** Accurate mathematical operations
- **Operations:** `add`, `subtract`, `multiply`, `divide`
- **Features:** Division by zero handling, human-readable expressions
- **Use case:** "What is 847 × 293?" (guaranteed accuracy)

#### 2. FileSystemTool (src/tools/definitions/FileSystemTool.ts)
- **Purpose:** Let the agent read, write, and explore files
- **Operations:** `read`, `write`, `list`, `exists`
- **Security:** Sandboxed to `./workspace` directory (prevents access outside)
- **Use case:** "Save this information to a file" or "What files are in the workspace?"

#### 3. TaskTool (src/tools/definitions/TaskTool.ts)
- **Purpose:** Let the agent track tasks and projects
- **Operations:** `create`, `start`, `complete`, `fail`, `list`, `get`
- **Persistence:** Tasks saved to `data/tasks/tasks.json`
- **Use case:** "Create a task to review the code" or "What tasks are pending?"

### Removed Tools

- **WebSearchTool** - Removed due to DuckDuckGo API limitations. A proper web search tool will be added in Phase 10 with a real search API.

### Supporting Infrastructure

#### TaskTracker (src/agent/TaskTracker.ts)
- In-memory task storage with CRUD operations
- Hierarchical tasks (subtasks)
- Statistics generation

#### TaskPersistence (src/persistence/TaskPersistence.ts)
- JSON file storage for tasks
- Handles Date serialization
- Auto-creates data directory

### Key Files (Phase 5)
```
✅ src/tools/definitions/CalculatorTool.ts
✅ src/tools/definitions/FileSystemTool.ts
✅ src/tools/definitions/TaskTool.ts
✅ src/agent/TaskTracker.ts
✅ src/persistence/TaskPersistence.ts
❌ src/tools/definitions/WebSearchTool.ts (removed)
```

### What You Learned (Phase 5)

**Tool Design:**
- Making tools that are genuinely useful to the agent
- Sandboxing for security (restricting file access)
- When to remove a tool that doesn't serve its purpose well

**Persistence:**
- JSON file storage patterns
- Handling Date serialization/deserialization
- Creating directories programmatically

---

## 🌊 Phase 6: Streaming Responses

**Started:** January 23, 2025
**Status:** Complete
**Goal:** Display responses in real-time as Claude generates them

### Learning Objectives

- The streaming API (`stream()` vs `create()`)
- Server-Sent Events (SSE) concept
- Async iteration patterns in TypeScript
- Handling streaming with tool use

### What We Built

#### 1. Streaming Agent Method
- Added `chatStream()` method to Agent class
- Returns async generator yielding text chunks
- Handles tool use during streaming (stream → tool → stream)

#### 2. Streaming Agentic Loop
- Same pattern as regular loop, but streams text in real-time
- Processes stream events as they arrive
- Gets final message for complete data and stop reason

#### 3. CLI Streaming Display
- `startStreamingResponse()` - Initialize streaming output
- `writeStreamChunk()` - Output text without newlines
- `endStreamingResponse()` - Clean up after streaming
- `displayToolUseNotification()` - Show tool use during stream

### Key Concepts

**Stream Events:**
- `content_block_start` - New block beginning (text or tool_use)
- `content_block_delta` - Chunk of content (text_delta or input_json_delta)
- `message_delta` - Message updates (stop_reason)

**Callback Pattern:**
```typescript
interface StreamCallbacks {
  onText?: (text: string) => void;
  onToolUse?: (toolName: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}
```

### Key Files Updated (Phase 6)
```
✅ src/agent/Agent.ts (added chatStream method)
✅ src/types/agent.types.ts (added StreamCallbacks)
✅ src/cli/display.ts (added streaming display functions)
✅ src/cli/commands.ts (uses streaming in chat loop)
✅ learning/05-streaming.md (new learning guide)
```

### What You Learned (Phase 6)

**Streaming API:**
- Using `client.messages.stream()` instead of `create()`
- Processing events with `for await...of`
- Getting complete data with `await stream.finalMessage()`

**Terminal Output:**
- Using `process.stdout.write()` for output without newlines
- Managing display state during streaming
- Handling tool use interruptions cleanly

**TypeScript Patterns:**
- Async generators and iteration
- Callback interfaces for extensibility
- Event-driven programming

---

## 🎭 Phase 7: System Prompts & Agent Behavior

**Started:** January 23, 2025
**Status:** Complete
**Goal:** Understand how to shape agent behavior through system prompts

### Learning Objectives

- How system prompts shape agent behavior
- Prompt engineering fundamentals
- Designing agent personas
- Component-based prompt construction

### What We Built

#### 1. Persona System (`src/config/personas.ts`)
- `SystemPromptComponents` interface - Break prompts into role, style, focus, constraints
- `Persona` interface - Complete package of components + settings
- `buildSystemPrompt()` - Assemble components into final prompt
- 6 predefined personas: default, coder, creative, concise, teacher, socratic

#### 2. Agent Persona Support
- `setPersona(id)` - Switch to a different persona
- `getPersona()` - Get current persona
- `setSystemPrompt(prompt)` - Set custom prompt
- `getAvailablePersonas()` - List available persona IDs
- Automatic temperature adjustment based on persona

#### 3. CLI Commands
- `/personas` - List all available personas
- `/persona` - Show current persona details
- `/persona <id>` - Switch to a different persona
- `/persona info <id>` - Show details of a specific persona

### Predefined Personas

| ID | Name | Description | Temperature |
|----|------|-------------|-------------|
| `default` | Helpful Assistant | General-purpose assistant | 0.7 |
| `coder` | Coding Assistant | Programming and technical help | 0.3 |
| `creative` | Creative Writer | Creative writing and storytelling | 1.0 |
| `concise` | Concise Assistant | Brief, to-the-point answers | 0.5 |
| `teacher` | Patient Teacher | Clear explanations for learning | 0.6 |
| `socratic` | Socratic Guide | Guides through questions | 0.7 |

### Key Files (Phase 7)
```
✅ src/config/personas.ts (new - persona definitions)
✅ src/agent/Agent.ts (updated - persona methods)
✅ src/cli/display.ts (updated - persona display)
✅ src/cli/commands.ts (updated - persona commands)
✅ learning/06-system-prompts.md (new - learning guide)
```

### What You Learned (Phase 7)

**Prompt Engineering:**
- Breaking prompts into components (role, style, focus, constraints)
- How temperature affects behavior
- Best practices for effective prompts

**System Design:**
- Persona as a reusable package
- Dynamic behavior switching
- Building prompts programmatically

---

## 📊 Phase 8: Context Window Management

**Started:** January 25, 2025
**Status:** Complete
**Goal:** Handle long conversations by managing the context window

### Learning Objectives

- Understanding the context window and its limits
- Token counting and estimation
- Strategies for managing long conversations
- Cost optimization through context management

### What We Built

#### 1. ContextManager Class (`src/agent/ContextManager.ts`)
- Token estimation (~4 chars per token heuristic)
- Token statistics tracking
- Configurable thresholds (warning, action)
- Multiple context strategies

#### 2. Context Strategies
- **None** - No management, let API error if too large
- **Sliding Window** - Remove oldest messages when approaching limit
- **Summarize** - Create summary of removed messages for reference

#### 3. Agent Integration
- Automatic context check before each API call
- Automatic trimming when threshold reached
- Context statistics and status methods

#### 4. CLI Commands
- `/context` - Show context window usage and stats
- `/context config` - Show context configuration
- `/context trim` - Force trim old messages
- `/context strategy <name>` - Change context strategy

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxContextTokens` | 190,000 | Max tokens (below model limit) |
| `strategy` | `sliding_window` | How to handle full context |
| `warningThreshold` | 0.7 | Show warning at 70% |
| `actionThreshold` | 0.85 | Take action at 85% |
| `keepRecentMessages` | 10 | Always keep recent N messages |
| `targetAfterTrim` | 0.5 | Target 50% after trimming |

### Key Files (Phase 8)
```
✅ src/agent/ContextManager.ts (new - context management)
✅ src/agent/ConversationManager.ts (updated - setMessages, prependContext)
✅ src/agent/Agent.ts (updated - context integration)
✅ src/cli/commands.ts (updated - context commands)
✅ src/cli/display.ts (updated - help text)
✅ learning/07-context-management.md (new - learning guide)
```

### What You Learned (Phase 8)

**Context Window:**
- Understanding token limits (200k for Claude Sonnet)
- Why context management matters (cost, speed, API limits)
- Token estimation techniques

**Strategies:**
- Sliding window - simple, loses old context
- Summarization - preserves some context
- Trade-offs between strategies

**Integration Patterns:**
- Automatic checks before API calls
- Graceful degradation when limits approached
- User feedback (warnings, stats)

---

## 💾 Phase 9: Persistence

**Started:** January 25, 2025
**Status:** Complete
**Goal:** Save and resume conversations

### Learning Objectives

- Saving and loading conversations to disk
- JSON serialization and Date handling
- Session management patterns
- File system operations in Node.js

### What We Built

#### 1. ConversationPersistence Class (`src/persistence/ConversationPersistence.ts`)
- Save conversations to JSON files
- Load conversations and restore Date objects
- List all saved conversations with metadata
- Delete saved conversations

#### 2. Agent Integration
- `saveConversation(title?)` - Save current conversation
- `loadConversation(id)` - Load a saved conversation
- `listSavedConversations()` - List all saved conversations
- `deleteSavedConversation(id)` - Delete a saved conversation

#### 3. CLI Commands
- `/save [title]` - Save current conversation
- `/load <id>` - Load a saved conversation
- `/sessions` - List all saved conversations
- `/session info` - Show current session info
- `/session title <t>` - Set conversation title
- `/session delete <id>` - Delete a saved conversation

### Key Files (Phase 9)
```
✅ src/persistence/ConversationPersistence.ts (new)
✅ src/agent/Agent.ts (updated - persistence methods)
✅ src/cli/commands.ts (updated - session commands)
✅ src/cli/display.ts (updated - help text)
✅ learning/08-persistence.md (new - learning guide)
```

### What You Learned (Phase 9)

**Persistence:**
- JSON serialization/deserialization
- Date object restoration from JSON
- File system operations with fs/promises

**Session Management:**
- Listing and browsing saved sessions
- Title generation from content
- Preview text for quick identification

**Security:**
- Path sanitization to prevent traversal attacks
- Safe file naming conventions

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
│   ├── ConversationManager.ts    # Message history management
│   ├── ContextManager.ts         # Context window management (Phase 8)
│   └── TaskTracker.ts            # Task management (Phase 5)
│
├── persistence/                  # Data persistence
│   ├── TaskPersistence.ts        # JSON file storage for tasks (Phase 5)
│   └── ConversationPersistence.ts # Conversation save/load (Phase 9)
│
├── tools/                        # Tool system ✅
│   ├── ToolRegistry.ts           # Tool management
│   ├── ToolExecutor.ts           # Tool execution
│   └── definitions/              # Individual tools
│       ├── BaseTool.ts           # Abstract base class
│       ├── CalculatorTool.ts     # Math operations
│       ├── FileSystemTool.ts     # File read/write (Phase 5)
│       ├── TaskTool.ts           # Task management (Phase 5)
│       ├── WebSearchTool.ts      # Web search (Phase 5)
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

## 🔮 Future Phases

### Phase 6: Streaming Responses
**Goal:** Real-time response streaming

**What We'll Build:**
- Agent streams responses character by character
- Streaming works with tool calls (stream → tool → stream)
- Visual loading indicators during processing

**What You'll Learn:**
- The streaming API (`stream: true`)
- Server-Sent Events (SSE) concept
- Async iteration patterns in TypeScript

---

### Phase 7: System Prompts & Agent Behavior
**Goal:** Customize agent behavior through prompts

**What We'll Build:**
- Configurable system prompt (not hardcoded)
- Agent "personality" options
- Understanding of how prompts affect tool use decisions

**What You'll Learn:**
- How system prompts shape agent behavior
- Prompt engineering fundamentals
- Persona design and consistency

---

### Phase 8: Context Window Management
**Goal:** Handle long conversations effectively

**What We'll Build:**
- Token usage tracking per message
- Automatic conversation summarization when approaching limits
- Configurable context strategies

**What You'll Learn:**
- Token counting and limits
- Context window strategies (sliding window, summarization)
- Cost optimization (fewer tokens = cheaper)

---

### Phase 9: Persistence
**Goal:** Save and resume conversations

**What We'll Build:**
- Save conversations to JSON files
- Load and resume previous sessions
- Session management (list, delete)

**What You'll Learn:**
- Conversation serialization/deserialization
- File system operations for persistence
- Session management patterns

---

### Phase 10: Memory & Web Search
**Goal:** Long-term memory and external data

**What We'll Build:**
- Long-term memory tool (store/recall facts about user)
- Web search with a real API (Brave, SerpAPI, or similar)
- Distinction between conversation memory and factual memory

**What You'll Learn:**
- Memory architectures (short-term vs long-term)
- External API integration with proper error handling
- Memory retrieval strategies

---

### Phase 11: Production Readiness
**Goal:** Make the agent robust and maintainable

**What We'll Build:**
- Graceful error recovery
- Automatic retries with exponential backoff
- Basic test suite for tools and agent
- Rate limit handling

**What You'll Learn:**
- Error handling and retry patterns
- Testing non-deterministic systems
- Agent observability (logging, debugging)

---

### Phase 12: Vision & Multi-modal
**Goal:** Process images and multi-modal inputs

**What We'll Build:**
- Image processing capability
- Multi-modal input handling
- Vision-based tools

**What You'll Learn:**
- Multi-modal API usage
- Image encoding and handling
- Vision-specific use cases

---

### Future Exploration (Not Yet Planned in Detail)
- Multi-agent patterns (agents calling other agents)
- Structured output / JSON mode
- Advanced orchestration
- Custom model fine-tuning integration

---

## 📚 Learning Guide

A separate **Learning Guide** has been created to serve as a standalone reference for building AI agents. Located in the `learning/` folder:

| File | Topic |
|------|-------|
| `learning_summary.md` | Overview, quick reference, glossary |
| `01-foundations.md` | Project setup, TypeScript essentials |
| `02-core-agent.md` | Anthropic API, conversations |
| `03-tool-system.md` | Tool architecture, Zod, registry |
| `04-agentic-loop.md` | Autonomous tool use, the loop |
| `05-streaming.md` | Streaming API, real-time responses |
| `06-system-prompts.md` | Prompt engineering, personas |
| `07-context-management.md` | Token limits, context strategies |
| `08-persistence.md` | Save/load conversations, sessions |

Each file includes:
- Explanations of concepts
- Reusable code snippets
- Exercises with solutions
- Quick reference sections

**New topic files will be added as each phase is completed.**

---

## 📊 Progress Tracker

| Phase | Status | Date | Key Deliverable |
|-------|--------|------|-----------------|
| Phase 1: Foundation | ✅ Complete | Jan 14, 2025 | Project setup, types, utils |
| Phase 2: Core Agent | ✅ Complete | Jan 14, 2025 | Working conversational agent |
| Phase 3: Tool Foundation | ✅ Complete | Jan 15, 2025 | BaseTool, CalculatorTool, ToolRegistry |
| Phase 4: Tool Integration | ✅ Complete | Jan 15, 2025 | Agentic loop, ToolExecutor |
| Phase 5: Tool Completion | ✅ Complete | Jan 19-23, 2025 | FileSystem, Task tools (polished) |
| Phase 6: Streaming | ✅ Complete | Jan 23, 2025 | Real-time responses |
| Phase 7: System Prompts | ✅ Complete | Jan 23, 2025 | Agent behavior customization |
| Phase 8: Context Management | ✅ Complete | Jan 25, 2025 | Token limits, context strategies |
| Phase 9: Persistence | ✅ Complete | Jan 25, 2025 | Save/load conversations |
| Phase 10: Memory & Web | ⏳ Pending | - | Long-term memory, web search |
| Phase 11: Production | ⏳ Pending | - | Error handling, testing |
| Phase 12: Vision | ⏳ Pending | - | Multi-modal, images |

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

**Last Updated:** Phase 9 (Persistence) Complete - January 25, 2025
**Next Update:** After Phase 10 begins or completes
**Learning Guide:** See `learning/` folder for standalone reference materials
