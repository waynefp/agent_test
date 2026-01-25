# 04 - The Agentic Loop

**Phase:** 4
**Goal:** Enable Claude to autonomously decide when to use tools
**Prerequisites:** [03-tool-system.md](./03-tool-system.md)

---

## What You'll Learn

- What the agentic loop is and why it matters
- Understanding stop reasons
- Executing tools and returning results
- Preventing infinite loops
- Building a complete tool-using agent

---

## 1. What is the Agentic Loop?

The **agentic loop** is the pattern that makes AI agents autonomous. Instead of just generating text, the agent can:

1. **Decide** if it needs to use a tool
2. **Call** the tool with appropriate inputs
3. **Process** the result
4. **Continue** reasoning or respond to the user

### The Flow

```
┌─────────────────────────────────────────────────────────┐
│                    AGENTIC LOOP                         │
│                                                         │
│   User Message                                          │
│        │                                                │
│        ▼                                                │
│   ┌─────────┐                                          │
│   │  Claude │◄─────────────────────────┐               │
│   └────┬────┘                          │               │
│        │                               │               │
│        ▼                               │               │
│   ┌─────────────┐     ┌─────────┐      │               │
│   │ stop_reason │────►│end_turn │──────┼───► Response  │
│   └─────────────┘     └─────────┘      │      to User  │
│        │                               │               │
│        │              ┌─────────┐      │               │
│        └─────────────►│tool_use │      │               │
│                       └────┬────┘      │               │
│                            │           │               │
│                            ▼           │               │
│                       ┌─────────┐      │               │
│                       │ Execute │      │               │
│                       │  Tool   │      │               │
│                       └────┬────┘      │               │
│                            │           │               │
│                            ▼           │               │
│                       ┌─────────┐      │               │
│                       │  Send   │──────┘               │
│                       │ Result  │                      │
│                       └─────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### In Plain English

1. User asks: "What's 847 × 293?"
2. Claude thinks: "I should use the calculator for accuracy"
3. Claude responds with `stop_reason: "tool_use"` and requests calculator
4. Your code executes the calculator → 248,171
5. Your code sends the result back to Claude
6. Claude thinks: "Now I have the answer"
7. Claude responds with `stop_reason: "end_turn"` and the final answer
8. Your code returns response to user

---

## 2. Understanding Stop Reasons

When Claude responds, it tells you **why it stopped** generating. This is crucial for the agentic loop.

```typescript
type StopReason =
  | "end_turn"      // Claude is done - return to user
  | "tool_use"      // Claude wants to use a tool - execute it
  | "max_tokens"    // Response was cut off - might need to continue
  | "stop_sequence" // Hit a custom stop sequence
  | null;           // Still generating (streaming only)
```

### What to Do for Each

| Stop Reason | Action |
|-------------|--------|
| `end_turn` | Extract text, return to user |
| `tool_use` | Execute tool(s), send result back, loop again |
| `max_tokens` | Consider increasing limit or continuing |
| `stop_sequence` | Handle based on your application logic |

---

## 3. The Tool Execution Cycle

### Step 1: Detect Tool Use

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  tools: registry.toAnthropicFormat(),
  messages: conversation.toAnthropicFormat(),
});

if (response.stop_reason === "tool_use") {
  // Claude wants to use tools!
  const toolUseBlocks = response.content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  for (const toolUse of toolUseBlocks) {
    console.log(`Claude wants to use: ${toolUse.name}`);
    console.log(`With input:`, toolUse.input);
  }
}
```

### Step 2: Execute the Tool

```typescript
// src/tools/ToolExecutor.ts
import { ToolRegistry } from "./ToolRegistry.js";
import { ToolResult } from "./definitions/BaseTool.js";

export class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  async execute(name: string, input: unknown): Promise<ToolResult> {
    const tool = this.registry.getTool(name);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }

    return await tool.run(input);
  }

  // Execute multiple tools (sequentially)
  async executeMany(
    toolCalls: Array<{ name: string; input: unknown }>
  ): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>();

    for (const call of toolCalls) {
      const result = await this.execute(call.name, call.input);
      results.set(call.name, result);
    }

    return results;
  }
}
```

### Step 3: Send Result Back to Claude

Tool results are sent as a special message type:

```typescript
// Add Claude's response (including tool_use) to messages
conversation.addAssistantMessage(response.content);

// Execute each tool and add results
for (const toolUse of toolUseBlocks) {
  const result = await executor.execute(toolUse.name, toolUse.input);

  // Format result for Claude
  const resultContent = result.success
    ? JSON.stringify(result.data)
    : `Error: ${result.error}`;

  // Add as tool_result message
  conversation.addToolResult(toolUse.id, resultContent, !result.success);
}

// Now call Claude again - it will see the tool results
const nextResponse = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  tools: registry.toAnthropicFormat(),
  messages: conversation.toAnthropicFormat(),
});
```

### Message Format for Tool Results

```typescript
// What gets sent to Claude
{
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: "toolu_abc123",  // Must match the tool_use id
      content: "Result: 248171",
      is_error: false,              // Optional: true if tool failed
    }
  ]
}
```

---

## 4. The Complete Agentic Loop

Here's the full implementation:

```typescript
// src/agent/Agent.ts (with tool support)
import Anthropic from "@anthropic-ai/sdk";
import { ConversationManager } from "./ConversationManager.js";
import { ToolRegistry } from "../tools/ToolRegistry.js";
import { ToolExecutor } from "../tools/ToolExecutor.js";
import { BaseTool } from "../tools/definitions/BaseTool.js";

interface AgentConfig {
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  maxTurns?: number;  // Prevent infinite loops
}

export class Agent {
  private client: Anthropic;
  private conversation: ConversationManager;
  private registry: ToolRegistry;
  private executor: ToolExecutor;
  private config: Required<AgentConfig>;

  constructor(config: AgentConfig = {}) {
    this.client = new Anthropic();
    this.conversation = new ConversationManager();
    this.registry = new ToolRegistry();
    this.executor = new ToolExecutor(this.registry);

    this.config = {
      model: config.model || "claude-sonnet-4-5-20250929",
      maxTokens: config.maxTokens || 2048,
      systemPrompt: config.systemPrompt || "You are a helpful assistant.",
      maxTurns: config.maxTurns || 10,  // Safety limit
    };
  }

  // Register a tool
  registerTool(tool: BaseTool): void {
    this.registry.register(tool);
  }

  // The main chat method with agentic loop
  async chat(userMessage: string): Promise<string> {
    // Add user message
    this.conversation.addTextMessage("user", userMessage);

    let turns = 0;

    // THE AGENTIC LOOP
    while (turns < this.config.maxTurns) {
      turns++;

      // Call Claude
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: this.config.systemPrompt,
        tools: this.registry.toAnthropicFormat(),
        messages: this.conversation.toAnthropicFormat(),
      });

      // Check stop reason
      if (response.stop_reason === "end_turn") {
        // Claude is done - extract text and return
        this.conversation.addAssistantMessage(response.content);
        return this.extractText(response.content);
      }

      if (response.stop_reason === "tool_use") {
        // Claude wants to use tools
        this.conversation.addAssistantMessage(response.content);

        // Find all tool_use blocks
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
        );

        // Execute each tool and add results
        for (const toolUse of toolUseBlocks) {
          const result = await this.executor.execute(toolUse.name, toolUse.input);

          const resultContent = result.success
            ? JSON.stringify(result.data)
            : `Error: ${result.error}`;

          this.conversation.addToolResult(
            toolUse.id,
            resultContent,
            !result.success
          );
        }

        // Continue the loop - Claude will process tool results
        continue;
      }

      // Handle unexpected stop reasons
      if (response.stop_reason === "max_tokens") {
        this.conversation.addAssistantMessage(response.content);
        return this.extractText(response.content) + "\n[Response truncated]";
      }

      // Unknown stop reason - return what we have
      return this.extractText(response.content);
    }

    // Hit max turns - safety exit
    throw new Error(`Agent exceeded maximum turns (${this.config.maxTurns})`);
  }

  // Extract text from content blocks
  private extractText(content: Anthropic.ContentBlock[]): string {
    return content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map(block => block.text)
      .join("");
  }
}
```

---

## 5. Preventing Infinite Loops

Tools can create loops. Claude might:
- Call a tool that returns data requiring another tool
- Make mistakes and retry repeatedly
- Get stuck in circular reasoning

### Safety Measures

```typescript
// 1. Max turns limit (already in Agent above)
maxTurns: 10,

// 2. Track tool usage
private toolCallCount = 0;
private maxToolCalls = 20;

// In the loop:
this.toolCallCount += toolUseBlocks.length;
if (this.toolCallCount > this.maxToolCalls) {
  throw new Error("Too many tool calls");
}

// 3. Detect repeated tool calls
private recentCalls: string[] = [];

const callSignature = `${toolUse.name}:${JSON.stringify(toolUse.input)}`;
if (this.recentCalls.includes(callSignature)) {
  // Same exact call - might be stuck
  console.warn("Repeated tool call detected");
}
this.recentCalls.push(callSignature);
if (this.recentCalls.length > 10) this.recentCalls.shift();
```

---

## 6. Multiple Tool Calls

Claude can request multiple tools in a single response:

```typescript
// Claude's response might contain:
[
  { type: "text", text: "Let me check both things..." },
  { type: "tool_use", id: "1", name: "get_weather", input: { city: "NYC" } },
  { type: "tool_use", id: "2", name: "get_time", input: { timezone: "EST" } },
]
```

### Handle All Tools

```typescript
// Execute ALL tool_use blocks
const toolUseBlocks = response.content.filter(
  (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
);

// Execute in parallel for speed
const results = await Promise.all(
  toolUseBlocks.map(async (toolUse) => ({
    id: toolUse.id,
    result: await this.executor.execute(toolUse.name, toolUse.input),
  }))
);

// Add all results
for (const { id, result } of results) {
  const content = result.success
    ? JSON.stringify(result.data)
    : `Error: ${result.error}`;
  this.conversation.addToolResult(id, content, !result.success);
}
```

---

## 7. Complete Working Example

```typescript
// src/index.ts - Full agent with tools
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Minimal tool implementation
const tools: Anthropic.Tool[] = [
  {
    name: "calculator",
    description: "Performs math operations",
    input_schema: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
        a: { type: "number" },
        b: { type: "number" },
      },
      required: ["operation", "a", "b"],
    },
  },
  {
    name: "get_time",
    description: "Gets the current time",
    input_schema: {
      type: "object",
      properties: {
        timezone: { type: "string", default: "UTC" },
      },
      required: [],
    },
  },
];

// Tool execution
function executeTool(name: string, input: any): string {
  if (name === "calculator") {
    const { operation, a, b } = input;
    if (operation === "divide" && b === 0) return "Error: Division by zero";
    const ops: Record<string, number> = {
      add: a + b, subtract: a - b, multiply: a * b, divide: a / b
    };
    return JSON.stringify({ result: ops[operation], expression: `${a} ${operation} ${b}` });
  }

  if (name === "get_time") {
    return JSON.stringify({ time: new Date().toISOString(), timezone: input.timezone || "UTC" });
  }

  return "Error: Unknown tool";
}

// The agentic loop
async function agentChat(userMessage: string): Promise<string> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  const MAX_TURNS = 10;
  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;
    console.log(`\n--- Turn ${turns} ---`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      tools,
      messages,
    });

    console.log(`Stop reason: ${response.stop_reason}`);

    // End turn - return response
    if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("");
      return text;
    }

    // Tool use - execute and continue
    if (response.stop_reason === "tool_use") {
      // Add assistant message with tool_use blocks
      messages.push({ role: "assistant", content: response.content });

      // Find and execute tools
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`Executing tool: ${block.name}`);
          console.log(`Input:`, block.input);

          const result = executeTool(block.name, block.input);
          console.log(`Result: ${result}`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Add tool results as user message
      messages.push({ role: "user", content: toolResults });

      continue; // Loop again
    }

    // Unexpected stop reason
    break;
  }

  return "Agent stopped unexpectedly";
}

// Test it
async function main() {
  console.log("Testing agentic loop...\n");

  // Test 1: Simple calculation
  console.log("User: What is 42 * 17?");
  const result1 = await agentChat("What is 42 * 17?");
  console.log(`\nClaude: ${result1}`);

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Multiple tools needed
  console.log("User: What's 100 divided by 4, and what time is it?");
  const result2 = await agentChat("What's 100 divided by 4, and what time is it?");
  console.log(`\nClaude: ${result2}`);
}

main().catch(console.error);
```

---

## Exercises

### Exercise 1: Add Logging
Modify the agentic loop to log:
- Each turn number
- Tool calls made (name and input)
- Token usage per turn
- Total tokens used

### Exercise 2: Tool Call History
Add a method `getToolHistory()` that returns all tools called during the conversation, with their inputs and results.

### Exercise 3: Conditional Tool Access
Modify the agent to accept a `disabledTools` option that prevents certain tools from being used (don't send them to Claude).

<details>
<summary>Exercise 1 Solution</summary>

```typescript
interface TurnLog {
  turn: number;
  toolCalls: Array<{ name: string; input: unknown }>;
  inputTokens: number;
  outputTokens: number;
}

class Agent {
  private turnLogs: TurnLog[] = [];
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  async chat(userMessage: string): Promise<string> {
    // ... existing setup ...

    while (turns < this.config.maxTurns) {
      turns++;

      const response = await this.client.messages.create({ ... });

      // Log this turn
      const toolCalls = response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map(b => ({ name: b.name, input: b.input }));

      this.turnLogs.push({
        turn: turns,
        toolCalls,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      this.totalInputTokens += response.usage.input_tokens;
      this.totalOutputTokens += response.usage.output_tokens;

      console.log(`Turn ${turns}: ${toolCalls.length} tool calls, ` +
        `${response.usage.input_tokens}/${response.usage.output_tokens} tokens`);

      // ... rest of loop ...
    }
  }

  getTokenStats() {
    return {
      totalInput: this.totalInputTokens,
      totalOutput: this.totalOutputTokens,
      total: this.totalInputTokens + this.totalOutputTokens,
      turnLogs: this.turnLogs,
    };
  }
}
```
</details>

<details>
<summary>Exercise 2 Solution</summary>

```typescript
interface ToolCallRecord {
  timestamp: Date;
  toolName: string;
  input: unknown;
  result: unknown;
  success: boolean;
  executionTime: number;
}

class Agent {
  private toolHistory: ToolCallRecord[] = [];

  // In the tool execution section:
  for (const toolUse of toolUseBlocks) {
    const startTime = Date.now();
    const result = await this.executor.execute(toolUse.name, toolUse.input);

    this.toolHistory.push({
      timestamp: new Date(),
      toolName: toolUse.name,
      input: toolUse.input,
      result: result.data,
      success: result.success,
      executionTime: Date.now() - startTime,
    });

    // ... rest of handling ...
  }

  getToolHistory(): ToolCallRecord[] {
    return [...this.toolHistory];
  }
}
```
</details>

<details>
<summary>Exercise 3 Solution</summary>

```typescript
interface AgentConfig {
  // ... existing ...
  disabledTools?: string[];
}

class Agent {
  private disabledTools: Set<string>;

  constructor(config: AgentConfig = {}) {
    // ... existing ...
    this.disabledTools = new Set(config.disabledTools || []);
  }

  private getEnabledTools(): Anthropic.Tool[] {
    return this.registry
      .toAnthropicFormat()
      .filter(tool => !this.disabledTools.has(tool.name));
  }

  async chat(userMessage: string): Promise<string> {
    // In the API call:
    const response = await this.client.messages.create({
      // ...
      tools: this.getEnabledTools(),  // Only enabled tools
      // ...
    });
    // ...
  }

  disableTool(name: string): void {
    this.disabledTools.add(name);
  }

  enableTool(name: string): void {
    this.disabledTools.delete(name);
  }
}

// Usage
const agent = new Agent({ disabledTools: ["dangerous_tool"] });
```
</details>

---

## Quick Reference

### The Loop Pattern
```typescript
while (turns < maxTurns) {
  const response = await client.messages.create({ ... });

  if (response.stop_reason === "end_turn") {
    return extractText(response.content);
  }

  if (response.stop_reason === "tool_use") {
    // 1. Add assistant message
    messages.push({ role: "assistant", content: response.content });

    // 2. Execute tools, collect results
    const results = executeTools(response.content);

    // 3. Add tool results
    messages.push({ role: "user", content: results });

    continue; // Loop again
  }
}
```

### Tool Result Format
```typescript
{
  type: "tool_result",
  tool_use_id: "toolu_xxx",  // Must match tool_use block
  content: "result string",
  is_error: false,           // Optional
}
```

### Safety Limits
```typescript
maxTurns: 10,      // Max API calls per chat
maxToolCalls: 20,  // Max total tool executions
```

---

## Key Takeaways

1. **The loop is the core** - Keep calling Claude until `end_turn`
2. **Stop reason drives behavior** - Always check why Claude stopped
3. **Tool results go in user messages** - With type `tool_result`
4. **IDs must match** - `tool_use_id` must match the original `tool_use` block
5. **Prevent infinite loops** - Always have safety limits
6. **Multiple tools are common** - Handle arrays of tool_use blocks
7. **Order matters** - Messages must alternate user/assistant

---

## What's Next?

You now have a complete foundation for building agents! The remaining phases will enhance this:

- **Phase 5:** Add practical tools (FileSystem, Task tracking)
- **Phase 6:** Stream responses in real-time
- **Phase 7:** Master system prompts for agent behavior
- **Phase 8:** Manage long conversations
- **Phase 9:** Persist conversations across sessions
- **Phase 10:** Add memory and web search
- **Phase 11:** Handle errors like a pro
- **Phase 12:** Process images with vision

Each phase builds on this foundation. The agentic loop stays the same - you'll just be adding more tools and capabilities!

---

**Back to:** [learning_summary.md](./learning_summary.md)
