# Agent SDK Learning Guide

**Purpose:** A standalone reference for building AI agents using the Anthropic SDK. This guide distills the concepts learned in this project into reusable knowledge and code snippets.

**How to Use:** Start with the summary below, then dive into specific topics as needed. Each topic file includes explanations, code snippets, exercises, and quick reference sections.

---

## Table of Contents

| File | Topic | What You'll Learn |
|------|-------|-------------------|
| [01-foundations.md](./01-foundations.md) | Project Foundations | Project setup, TypeScript essentials, configuration |
| [02-core-agent.md](./02-core-agent.md) | Core Agent | Anthropic API, conversations, basic agent |
| [03-tool-system.md](./03-tool-system.md) | Tool System | Tool architecture, schemas, registry |
| [04-agentic-loop.md](./04-agentic-loop.md) | Agentic Loop | Autonomous tool use, the loop pattern |
| [05-streaming.md](./05-streaming.md) | Streaming | Real-time responses, SSE, async iteration |
| [06-system-prompts.md](./06-system-prompts.md) | System Prompts | Agent behavior, personas, prompt engineering |
| [07-context-management.md](./07-context-management.md) | Context Management | Token limits, context strategies, cost optimization |
| [08-persistence.md](./08-persistence.md) | Persistence | Save/load conversations, session management |
| *09-memory.md* | Memory & Web | Long-term memory, web search *(Coming in Phase 10)* |
| *10-production.md* | Production | Error handling, testing *(Coming in Phase 11)* |
| *11-vision.md* | Vision | Multi-modal, images *(Coming in Phase 12)* |

---

## Quick Concept Reference

### What is an Agent?

An **agent** is an AI that can:
1. **Converse** - Understand and respond to natural language
2. **Reason** - Decide what actions to take
3. **Act** - Use tools to accomplish tasks
4. **Learn** - Remember context and adapt

### The Agent Building Blocks

```
┌─────────────────────────────────────────────────────────┐
│                      YOUR AGENT                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Claude    │  │   Tools     │  │    Memory       │  │
│  │   (Brain)   │  │  (Hands)    │  │   (Storage)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│         │                │                 │            │
│         └────────────────┼─────────────────┘            │
│                          │                              │
│                   ┌──────▼──────┐                       │
│                   │   Agentic   │                       │
│                   │    Loop     │                       │
│                   └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Core Concepts at a Glance

| Concept | What It Is | Where to Learn |
|---------|-----------|----------------|
| **API Client** | Connection to Claude | [02-core-agent.md](./02-core-agent.md) |
| **Messages** | Conversation history | [02-core-agent.md](./02-core-agent.md) |
| **System Prompt** | Agent instructions | [06-system-prompts.md](./06-system-prompts.md) |
| **Tools** | Actions the agent can take | [03-tool-system.md](./03-tool-system.md) |
| **Tool Schema** | Definition of tool inputs | [03-tool-system.md](./03-tool-system.md) |
| **Agentic Loop** | Autonomous decision-making | [04-agentic-loop.md](./04-agentic-loop.md) |
| **Stop Reason** | Why Claude stopped responding | [04-agentic-loop.md](./04-agentic-loop.md) |
| **Streaming** | Real-time responses | [05-streaming.md](./05-streaming.md) |
| **Personas** | Agent behavior presets | [06-system-prompts.md](./06-system-prompts.md) |
| **Context Window** | Token limit management | [07-context-management.md](./07-context-management.md) |

---

## Minimal Agent - Complete Code

Here's the simplest possible agent in one file. This is what everything builds toward:

```typescript
import Anthropic from "@anthropic-ai/sdk";

// 1. Create client
const client = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

// 2. Define a tool
const tools: Anthropic.Tool[] = [
  {
    name: "calculator",
    description: "Performs basic math operations",
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
];

// 3. Tool execution function
function executeTool(name: string, input: any): string {
  if (name === "calculator") {
    const { operation, a, b } = input;
    const ops: Record<string, number> = {
      add: a + b,
      subtract: a - b,
      multiply: a * b,
      divide: a / b,
    };
    return `Result: ${ops[operation]}`;
  }
  return "Unknown tool";
}

// 4. The Agentic Loop
async function chat(userMessage: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  // Loop until we get a final response
  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      tools,
      messages,
    });

    // Check why Claude stopped
    if (response.stop_reason === "end_turn") {
      // Final response - extract text and return
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.type === "text" ? textBlock.text : "";
    }

    if (response.stop_reason === "tool_use") {
      // Claude wants to use a tool
      const toolUse = response.content.find((b) => b.type === "tool_use");
      if (toolUse?.type === "tool_use") {
        // Execute the tool
        const result = executeTool(toolUse.name, toolUse.input);

        // Add Claude's response and tool result to messages
        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: toolUse.id, content: result }],
        });
      }
    }
  }
}

// 5. Use the agent
const answer = await chat("What is 42 multiplied by 17?");
console.log(answer); // Claude will use the calculator and explain the result
```

**That's it.** Everything else in this guide is about making this pattern:
- More organized (separate files, classes)
- More powerful (more tools, streaming, memory)
- More robust (error handling, testing)
- More user-friendly (CLI, formatting)

---

## Learning Path Checklist

### Phase 1-4: Foundation (Complete)
- [ ] Understand project structure and TypeScript basics
- [ ] Create an Anthropic API client
- [ ] Build a conversation manager
- [ ] Create a basic agent class
- [ ] Build the tool system (BaseTool, Registry)
- [ ] Implement the agentic loop
- [ ] Test with a working tool (Calculator)

### Phase 5-12: Enhancement (In Progress)
- [ ] Add practical tools (FileSystem, Task)
- [ ] Implement streaming responses
- [ ] Master system prompts
- [ ] Handle context window limits
- [ ] Add conversation persistence
- [ ] Build long-term memory
- [ ] Add web search capability
- [ ] Make production-ready
- [ ] Add vision/multi-modal support

---

## Quick Reference: Essential Code Patterns

### Create API Client
```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

### Send a Message
```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }],
});
```

### Define a Tool (JSON Schema)
```typescript
const tool: Anthropic.Tool = {
  name: "tool_name",
  description: "What this tool does",
  input_schema: {
    type: "object",
    properties: {
      param1: { type: "string", description: "First parameter" },
    },
    required: ["param1"],
  },
};
```

### Check Stop Reason
```typescript
if (response.stop_reason === "end_turn") {
  // Claude is done, get the text response
}
if (response.stop_reason === "tool_use") {
  // Claude wants to use a tool
}
```

### Send Tool Result
```typescript
messages.push({
  role: "user",
  content: [{
    type: "tool_result",
    tool_use_id: "the-tool-use-id",
    content: "Result from the tool",
  }],
});
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Agent** | An AI system that can reason and take actions |
| **Agentic Loop** | Pattern where AI decides to use tools, executes them, then continues |
| **API Key** | Secret credential to access Claude |
| **Content Block** | A piece of a message (text, tool_use, tool_result) |
| **Context Window** | Maximum tokens Claude can process at once |
| **Message** | A single turn in the conversation (user or assistant) |
| **Model** | The specific Claude version (e.g., claude-sonnet-4-5-20250929) |
| **Stop Reason** | Why Claude stopped generating (end_turn, tool_use, max_tokens) |
| **System Prompt** | Instructions that define agent behavior |
| **Token** | A unit of text (~4 characters in English) |
| **Tool** | A function the agent can call |
| **Tool Schema** | JSON Schema defining a tool's inputs |
| **Tool Use** | When Claude requests to use a tool |
| **Tool Result** | The output returned after executing a tool |

---

*Last Updated: Phase 7 Complete*
*Next Update: After each phase completion*
