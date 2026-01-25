# 02 - Core Agent

**Phase:** 2
**Goal:** Build a working conversational agent
**Prerequisites:** [01-foundations.md](./01-foundations.md)

---

## What You'll Learn

- How to connect to the Anthropic API
- Understanding the message format
- Building a conversation manager
- Creating your first agent class

---

## 1. The Anthropic Client

The client is your connection to Claude. Create it once, reuse everywhere.

### Basic Setup

```typescript
// src/config/anthropic.config.ts
import Anthropic from "@anthropic-ai/sdk";

// The client reads ANTHROPIC_API_KEY from environment automatically
const client = new Anthropic();

export { client };
```

### With Explicit Configuration

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { env } from "./environment.js";

// Singleton pattern - create once, reuse
let clientInstance: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!clientInstance) {
    clientInstance = new Anthropic({
      apiKey: env.anthropicApiKey,
    });
  }
  return clientInstance;
}

// Default request configuration
export const DEFAULT_CONFIG = {
  model: "claude-sonnet-4-5-20250929",
  maxTokens: 2048,
  temperature: 1.0,
} as const;
```

**Why Singleton?**
- API clients are expensive to create
- Connection pooling works better with one client
- Easier to manage configuration in one place

---

## 2. Understanding Messages

Claude's API uses a specific message format. Understanding this is crucial.

### Message Structure

```typescript
// A message to Claude
interface MessageParam {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// Content can be simple text or structured blocks
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };
```

### Simple Conversation Example

```typescript
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "Hello! What's your name?" },
  { role: "assistant", content: "Hello! I'm Claude, an AI assistant made by Anthropic." },
  { role: "user", content: "Nice to meet you, Claude!" },
];
```

### Rules for Messages

1. **Alternating roles** - Messages must alternate between user and assistant
2. **User first** - Conversation must start with a user message
3. **User last** - When sending to API, last message must be from user

```typescript
// CORRECT
[user, assistant, user]  // ✓ Alternating, starts with user, ends with user

// INCORRECT
[assistant, user]        // ✗ Can't start with assistant
[user, user]             // ✗ Two users in a row
[user, assistant]        // ✗ Must end with user when sending to API
```

---

## 3. Making API Calls

### Basic Request

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function chat(message: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [
      { role: "user", content: message }
    ],
  });

  // Extract text from response
  const textBlock = response.content.find(block => block.type === "text");
  if (textBlock?.type === "text") {
    return textBlock.text;
  }
  return "";
}

// Usage
const reply = await chat("What is the capital of France?");
console.log(reply); // "The capital of France is Paris."
```

### Understanding the Response

```typescript
interface MessageResponse {
  id: string;                    // Unique message ID
  type: "message";
  role: "assistant";             // Always "assistant" for responses
  content: ContentBlock[];       // Array of content blocks
  model: string;                 // Model that generated this
  stop_reason: StopReason;       // Why Claude stopped
  usage: {
    input_tokens: number;        // Tokens in your request
    output_tokens: number;       // Tokens in Claude's response
  };
}

type StopReason =
  | "end_turn"      // Claude finished its response naturally
  | "tool_use"      // Claude wants to use a tool
  | "max_tokens"    // Hit the token limit
  | "stop_sequence" // Hit a custom stop sequence
  | null;
```

**Stop Reasons Explained:**

| Stop Reason | Meaning | Your Action |
|-------------|---------|-------------|
| `end_turn` | Claude is done | Return the response to user |
| `tool_use` | Claude wants to use a tool | Execute tool, send result back |
| `max_tokens` | Response was cut off | Maybe increase max_tokens |
| `stop_sequence` | Hit custom stop | Handle based on your logic |

---

## 4. Conversation Manager

The conversation manager maintains message history - the agent's "memory."

### Implementation

```typescript
// src/agent/ConversationManager.ts
import Anthropic from "@anthropic-ai/sdk";

interface Message {
  role: "user" | "assistant";
  content: Anthropic.ContentBlock[];
  timestamp: Date;
}

export class ConversationManager {
  private messages: Message[] = [];
  private id: string;

  constructor() {
    this.id = crypto.randomUUID();
  }

  // Add a text message
  addTextMessage(role: "user" | "assistant", text: string): void {
    this.messages.push({
      role,
      content: [{ type: "text", text }],
      timestamp: new Date(),
    });
  }

  // Add assistant response (may include tool_use blocks)
  addAssistantMessage(content: Anthropic.ContentBlock[]): void {
    this.messages.push({
      role: "assistant",
      content,
      timestamp: new Date(),
    });
  }

  // Add tool result (formatted as user message)
  addToolResult(toolUseId: string, result: string, isError = false): void {
    this.messages.push({
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: toolUseId,
        content: result,
        is_error: isError,
      }],
      timestamp: new Date(),
    });
  }

  // Convert to Anthropic API format
  toAnthropicFormat(): Anthropic.MessageParam[] {
    return this.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  // Get message count
  get length(): number {
    return this.messages.length;
  }

  // Clear history
  clear(): void {
    this.messages = [];
  }

  // Get conversation ID
  getId(): string {
    return this.id;
  }
}
```

### Usage

```typescript
const conversation = new ConversationManager();

// User asks a question
conversation.addTextMessage("user", "What is 2 + 2?");

// Send to Claude
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: conversation.toAnthropicFormat(),
});

// Add Claude's response
conversation.addAssistantMessage(response.content);

// User asks follow-up (Claude will remember context)
conversation.addTextMessage("user", "And what's that multiplied by 3?");
```

---

## 5. Building the Agent Class

The Agent class orchestrates everything - it's the "brain" of your system.

### Basic Agent (No Tools Yet)

```typescript
// src/agent/Agent.ts
import Anthropic from "@anthropic-ai/sdk";
import { ConversationManager } from "./ConversationManager.js";

interface AgentConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface AgentState {
  messageCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export class Agent {
  private client: Anthropic;
  private conversation: ConversationManager;
  private config: Required<AgentConfig>;
  private state: AgentState;

  constructor(config: AgentConfig = {}) {
    this.client = new Anthropic();
    this.conversation = new ConversationManager();

    // Apply defaults
    this.config = {
      model: config.model || "claude-sonnet-4-5-20250929",
      maxTokens: config.maxTokens || 2048,
      temperature: config.temperature ?? 1.0,
      systemPrompt: config.systemPrompt || "You are a helpful assistant.",
    };

    this.state = {
      messageCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };
  }

  async chat(userMessage: string): Promise<string> {
    // Add user message to history
    this.conversation.addTextMessage("user", userMessage);

    try {
      // Call Claude
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: this.config.systemPrompt,
        messages: this.conversation.toAnthropicFormat(),
      });

      // Update statistics
      this.state.messageCount += 2; // user + assistant
      this.state.totalInputTokens += response.usage.input_tokens;
      this.state.totalOutputTokens += response.usage.output_tokens;

      // Add response to history
      this.conversation.addAssistantMessage(response.content);

      // Extract and return text
      const textBlock = response.content.find(b => b.type === "text");
      return textBlock?.type === "text" ? textBlock.text : "";

    } catch (error) {
      // Remove the failed message from history
      this.conversation.clear(); // or implement a removeLastMessage()
      throw error;
    }
  }

  // Get current state
  getState(): AgentState {
    return { ...this.state };
  }

  // Clear conversation history
  clearConversation(): void {
    this.conversation.clear();
    this.state.messageCount = 0;
  }

  // Get conversation history
  getHistory(): Anthropic.MessageParam[] {
    return this.conversation.toAnthropicFormat();
  }
}
```

### Factory Function

```typescript
// Cleaner way to create agents
export function createAgent(config?: AgentConfig): Agent {
  return new Agent(config);
}

// Usage
const agent = createAgent({
  systemPrompt: "You are a helpful coding assistant.",
  temperature: 0.7, // More focused responses
});

const response = await agent.chat("How do I reverse a string in JavaScript?");
```

---

## 6. Complete Working Example

Here's a minimal but complete conversational agent:

```typescript
// src/index.ts
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

// Simple agent with conversation memory
class SimpleAgent {
  private client = new Anthropic();
  private messages: Anthropic.MessageParam[] = [];

  async chat(userMessage: string): Promise<string> {
    // Add user message
    this.messages.push({ role: "user", content: userMessage });

    // Call Claude
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: "You are a helpful assistant. Be concise.",
      messages: this.messages,
    });

    // Extract text
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("");

    // Add assistant response to history
    this.messages.push({ role: "assistant", content: text });

    return text;
  }
}

// Interactive CLI
async function main() {
  const agent = new SimpleAgent();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("Chat with Claude (type 'exit' to quit)\n");

  const askQuestion = () => {
    rl.question("You: ", async (input) => {
      const message = input.trim();

      if (message.toLowerCase() === "exit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      if (!message) {
        askQuestion();
        return;
      }

      try {
        const response = await agent.chat(message);
        console.log(`\nClaude: ${response}\n`);
      } catch (error) {
        console.error("Error:", error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

main();
```

Run with: `npx tsx src/index.ts`

---

## 7. Error Handling

Always handle API errors gracefully:

```typescript
import Anthropic from "@anthropic-ai/sdk";

async function safeChat(client: Anthropic, message: string): Promise<string> {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{ role: "user", content: message }],
    });

    const text = response.content.find(b => b.type === "text");
    return text?.type === "text" ? text.text : "";

  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      // API-specific errors
      switch (error.status) {
        case 401:
          throw new Error("Invalid API key. Check your ANTHROPIC_API_KEY.");
        case 429:
          throw new Error("Rate limited. Please wait and try again.");
        case 500:
          throw new Error("Anthropic server error. Try again later.");
        default:
          throw new Error(`API error (${error.status}): ${error.message}`);
      }
    }

    // Network or other errors
    throw new Error(`Failed to communicate with Claude: ${error}`);
  }
}
```

---

## Exercises

### Exercise 1: Token Tracker
Modify the Agent class to track:
1. Tokens used per message
2. Running total of all tokens
3. Estimated cost (input: $3/million, output: $15/million)

### Exercise 2: Conversation Summary
Add a method `getSummary()` that returns:
1. Number of messages
2. First message preview (first 50 chars)
3. Last message preview (first 50 chars)
4. Total characters exchanged

### Exercise 3: Message Formatting
Create a helper function that formats conversation history for display:
```
[12:30:45] User: Hello!
[12:30:47] Claude: Hello! How can I help you today?
```

<details>
<summary>Exercise 1 Solution</summary>

```typescript
interface TokenUsage {
  input: number;
  output: number;
  total: number;
  estimatedCost: number; // in dollars
}

class Agent {
  private tokenHistory: { input: number; output: number }[] = [];

  async chat(message: string): Promise<string> {
    // ... existing code ...

    // After API call:
    this.tokenHistory.push({
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    });

    // ... rest of method ...
  }

  getTokenUsage(): TokenUsage {
    const input = this.tokenHistory.reduce((sum, t) => sum + t.input, 0);
    const output = this.tokenHistory.reduce((sum, t) => sum + t.output, 0);

    // $3 per million input, $15 per million output
    const inputCost = (input / 1_000_000) * 3;
    const outputCost = (output / 1_000_000) * 15;

    return {
      input,
      output,
      total: input + output,
      estimatedCost: inputCost + outputCost,
    };
  }
}
```
</details>

<details>
<summary>Exercise 2 Solution</summary>

```typescript
interface ConversationSummary {
  messageCount: number;
  firstMessagePreview: string;
  lastMessagePreview: string;
  totalCharacters: number;
}

getSummary(): ConversationSummary {
  const messages = this.conversation.toAnthropicFormat();

  const getTextPreview = (msg: Anthropic.MessageParam): string => {
    if (typeof msg.content === "string") {
      return msg.content.slice(0, 50);
    }
    const textBlock = msg.content.find(b => b.type === "text");
    return textBlock?.type === "text" ? textBlock.text.slice(0, 50) : "";
  };

  const getTotalChars = (): number => {
    return messages.reduce((sum, msg) => {
      if (typeof msg.content === "string") return sum + msg.content.length;
      return sum + msg.content.reduce((s, b) => {
        return s + (b.type === "text" ? b.text.length : 0);
      }, 0);
    }, 0);
  };

  return {
    messageCount: messages.length,
    firstMessagePreview: messages[0] ? getTextPreview(messages[0]) : "",
    lastMessagePreview: messages.length > 0
      ? getTextPreview(messages[messages.length - 1])
      : "",
    totalCharacters: getTotalChars(),
  };
}
```
</details>

<details>
<summary>Exercise 3 Solution</summary>

```typescript
function formatConversation(messages: Anthropic.MessageParam[]): string {
  return messages.map(msg => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    const role = msg.role === "user" ? "User" : "Claude";

    let text: string;
    if (typeof msg.content === "string") {
      text = msg.content;
    } else {
      const textBlock = msg.content.find(b => b.type === "text");
      text = textBlock?.type === "text" ? textBlock.text : "[non-text content]";
    }

    return `[${time}] ${role}: ${text}`;
  }).join("\n");
}
```
</details>

---

## Quick Reference

### Create Client
```typescript
const client = new Anthropic(); // Uses ANTHROPIC_API_KEY env var
```

### Send Message
```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  system: "System prompt here",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### Extract Text Response
```typescript
const text = response.content
  .filter((b): b is Anthropic.TextBlock => b.type === "text")
  .map(b => b.text)
  .join("");
```

### Check Token Usage
```typescript
console.log(`Input: ${response.usage.input_tokens}`);
console.log(`Output: ${response.usage.output_tokens}`);
```

---

## Key Takeaways

1. **Client is reusable** - Create once, use everywhere
2. **Messages must alternate** - user → assistant → user → ...
3. **Track tokens** - For cost management and debugging
4. **Handle errors** - API calls can fail for many reasons
5. **Conversation memory = message history** - The key to multi-turn chat

---

**Next:** [03-tool-system.md](./03-tool-system.md) - Giving your agent capabilities
