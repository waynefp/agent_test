# 05 - Streaming Responses

**Phase:** 6
**Goal:** Display responses in real-time as Claude generates them
**Prerequisites:** [04-agentic-loop.md](./04-agentic-loop.md)

---

## What You'll Learn

- How to use the streaming API
- Processing Server-Sent Events (SSE)
- Async iteration patterns in TypeScript
- Handling streaming with tool use

---

## 1. Why Streaming?

Without streaming:
```
User: Tell me about TypeScript
[3 seconds of nothing...]
[Entire response appears at once]
```

With streaming:
```
User: Tell me about TypeScript
TypeScript is a... [text appears character by character as it's generated]
```

**Benefits:**
- Better user experience (feels responsive)
- Lower perceived latency
- Can show partial results immediately
- Users can start reading while more is generated

---

## 2. The Streaming API

The Anthropic SDK provides a `stream()` method instead of `create()`:

### Non-Streaming (what you've been using)
```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }],
});
// Response is complete - all at once
console.log(response.content[0].text);
```

### Streaming
```typescript
const stream = client.messages.stream({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }],
});

// Process events as they arrive
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'text_delta') {
      process.stdout.write(event.delta.text); // Print without newline
    }
  }
}

// Get the final complete message
const finalMessage = await stream.finalMessage();
```

---

## 3. Stream Events

The stream emits different types of events:

### Event Types

| Event Type | When It Fires | What It Contains |
|------------|---------------|------------------|
| `message_start` | Beginning of response | Initial message metadata |
| `content_block_start` | Starting a new block | Block type (text, tool_use) |
| `content_block_delta` | Chunk of content | Text chunk or tool input chunk |
| `content_block_stop` | Block finished | Block index |
| `message_delta` | Message update | Stop reason, usage |
| `message_stop` | Stream complete | Nothing |

### Content Block Delta Types

```typescript
// Text being generated
{
  type: 'content_block_delta',
  index: 0,
  delta: {
    type: 'text_delta',
    text: 'Hello'  // The actual text chunk
  }
}

// Tool input being generated (JSON)
{
  type: 'content_block_delta',
  index: 1,
  delta: {
    type: 'input_json_delta',
    partial_json: '{"oper'  // Partial JSON string
  }
}
```

---

## 4. Basic Streaming Implementation

```typescript
import Anthropic from '@anthropic-ai/sdk';

async function streamChat(message: string): Promise<string> {
  const client = new Anthropic();
  let fullText = '';

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [{ role: 'user', content: message }],
  });

  // Process the stream
  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        const text = event.delta.text;
        fullText += text;

        // Print in real-time (no newline)
        process.stdout.write(text);
      }
    }
  }

  // Add final newline
  console.log();

  return fullText;
}

// Usage
const response = await streamChat('Explain async/await in 3 sentences.');
```

---

## 5. Streaming with Tools

Streaming gets more complex with tools because:
1. Claude might output text, then decide to use a tool
2. You execute the tool
3. Claude continues (potentially streaming more text)

### The Flow

```
User: "What's 25 * 4 and explain it"
         │
         ▼
┌─────────────────────────────────────┐
│ Stream: "Let me calculate that..." │
│        (text_delta events)          │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Stream: tool_use block starts       │
│ Event: content_block_start          │
│        type: tool_use               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Stream: tool input JSON             │
│ Event: input_json_delta             │
│        partial_json: ...            │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ stop_reason: tool_use               │
│ Execute tool, send result           │
│ Start new streaming request         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Stream: "25 × 4 = 100. This is..."  │
│ stop_reason: end_turn               │
└─────────────────────────────────────┘
```

### Implementation Pattern

```typescript
async function streamWithTools(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  onText: (text: string) => void,
  onToolUse: (name: string) => void
): Promise<string> {
  const maxTurns = 10;
  let fullText = '';

  for (let turn = 0; turn < maxTurns; turn++) {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages,
      tools,
    });

    // Process stream
    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          onToolUse(event.content_block.name);
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          fullText += event.delta.text;
          onText(event.delta.text);
        }
      }
    }

    // Get final message for stop_reason and complete tool inputs
    const finalMessage = await stream.finalMessage();

    // Check if done
    if (finalMessage.stop_reason === 'end_turn') {
      return fullText;
    }

    // Handle tool use
    if (finalMessage.stop_reason === 'tool_use') {
      // Add assistant message
      messages.push({ role: 'assistant', content: finalMessage.content });

      // Execute tools and add results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          const result = executeYourTool(block.name, block.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Add tool results
      messages.push({ role: 'user', content: toolResults });

      // Continue loop for next streaming turn
      continue;
    }

    // Other stop reasons
    break;
  }

  return fullText;
}
```

---

## 6. Callback Pattern for Streaming

A clean way to handle streaming is with callbacks:

```typescript
interface StreamCallbacks {
  onText?: (text: string) => void;
  onToolUse?: (toolName: string) => void;
  onToolResult?: (toolName: string, success: boolean) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  onUsage?: (inputTokens: number, outputTokens: number) => void;
}

async function chatStream(
  message: string,
  callbacks: StreamCallbacks
): Promise<string> {
  // ... implementation uses callbacks to notify caller
  callbacks.onText?.('Hello');  // Notify of text chunk
  callbacks.onToolUse?.('calculator');  // Notify of tool use
  callbacks.onComplete?.(fullText);  // Notify when done
  // etc.
}

// Usage
await chatStream('Hello', {
  onText: (text) => process.stdout.write(text),
  onToolUse: (name) => console.log(`\n[Using ${name}...]`),
  onComplete: () => console.log('\n'),
});
```

---

## 7. Terminal Display for Streaming

```typescript
import chalk from 'chalk';

// Start streaming output
function startStreaming(): void {
  process.stdout.write(chalk.bold.green('Assistant: '));
}

// Write a chunk (no newline)
function writeChunk(text: string): void {
  process.stdout.write(chalk.white(text));
}

// End streaming output
function endStreaming(): void {
  console.log();  // Final newline
  console.log();  // Blank line after
}

// Show tool use notification
function showToolUse(toolName: string): void {
  console.log();  // End current line
  console.log(chalk.yellow(`  [Using tool: ${toolName}...]`));
  startStreaming();  // Resume streaming position
}

// Usage in chat loop
async function handleChat(message: string) {
  startStreaming();

  await agent.chatStream(message, {
    onText: (text) => writeChunk(text),
    onToolUse: (name) => showToolUse(name),
    onComplete: () => endStreaming(),
  });
}
```

---

## 8. Error Handling in Streams

Streams can fail mid-response. Handle gracefully:

```typescript
async function safeStreamChat(message: string): Promise<string> {
  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: message }],
    });

    let fullText = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          fullText += event.delta.text;
          process.stdout.write(event.delta.text);
        }
      }
    }

    console.log();
    return fullText;

  } catch (error) {
    // Stream failed - could be network, rate limit, etc.
    console.log();  // End partial line
    console.error(chalk.red('Stream error:', error.message));

    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        console.log('Rate limited. Please wait and try again.');
      }
    }

    throw error;
  }
}
```

---

## Exercises

### Exercise 1: Word Counter Stream
Create a streaming function that:
- Streams the response
- Counts words as they arrive
- Displays word count at the end

### Exercise 2: Progress Indicator
Modify streaming to show:
- A spinner while waiting for first chunk
- Character count as streaming
- Final stats (chars, tokens) at end

### Exercise 3: Streaming with Abort
Implement a way to:
- Cancel streaming mid-response (e.g., user presses Escape)
- Clean up properly
- Return partial response

<details>
<summary>Exercise 1 Solution</summary>

```typescript
async function streamWithWordCount(message: string): Promise<{
  text: string;
  wordCount: number;
}> {
  const client = new Anthropic();
  let fullText = '';
  let wordCount = 0;

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [{ role: 'user', content: message }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        const text = event.delta.text;
        fullText += text;

        // Count words in chunk (split by whitespace)
        const words = text.split(/\s+/).filter(w => w.length > 0);
        wordCount += words.length;

        process.stdout.write(text);
      }
    }
  }

  console.log();
  console.log(chalk.gray(`\n[${wordCount} words]`));

  return { text: fullText, wordCount };
}
```
</details>

<details>
<summary>Exercise 2 Solution</summary>

```typescript
import ora from 'ora';

async function streamWithProgress(message: string): Promise<string> {
  const client = new Anthropic();
  const spinner = ora('Waiting for response...').start();

  let fullText = '';
  let charCount = 0;
  let isFirstChunk = true;

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [{ role: 'user', content: message }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        if (isFirstChunk) {
          spinner.stop();
          process.stdout.write(chalk.bold.green('Assistant: '));
          isFirstChunk = false;
        }

        const text = event.delta.text;
        fullText += text;
        charCount += text.length;

        process.stdout.write(text);
      }
    }
  }

  const finalMessage = await stream.finalMessage();

  console.log();
  console.log(chalk.gray(
    `[${charCount} chars | ${finalMessage.usage.input_tokens} in / ` +
    `${finalMessage.usage.output_tokens} out tokens]`
  ));

  return fullText;
}
```
</details>

<details>
<summary>Exercise 3 Solution</summary>

```typescript
async function streamWithAbort(
  message: string,
  abortSignal: AbortSignal
): Promise<{ text: string; aborted: boolean }> {
  const client = new Anthropic();
  let fullText = '';
  let aborted = false;

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [{ role: 'user', content: message }],
  });

  try {
    for await (const event of stream) {
      // Check for abort
      if (abortSignal.aborted) {
        aborted = true;
        stream.controller.abort();  // Cancel the stream
        break;
      }

      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          fullText += event.delta.text;
          process.stdout.write(event.delta.text);
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(chalk.yellow('\n[Response cancelled]'));
      aborted = true;
    } else {
      throw error;
    }
  }

  return { text: fullText, aborted };
}

// Usage with AbortController
const controller = new AbortController();

// Listen for Escape key (simplified)
process.stdin.on('keypress', (str, key) => {
  if (key.name === 'escape') {
    controller.abort();
  }
});

const result = await streamWithAbort('Tell me a long story', controller.signal);
```
</details>

---

## Quick Reference

### Start Streaming
```typescript
const stream = client.messages.stream({ model, max_tokens, messages });
```

### Process Events
```typescript
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
```

### Get Final Message
```typescript
const finalMessage = await stream.finalMessage();
console.log(finalMessage.stop_reason);  // 'end_turn', 'tool_use', etc.
console.log(finalMessage.usage);        // Token counts
```

### Output Without Newline
```typescript
process.stdout.write(text);  // No newline
console.log();               // Just newline
```

---

## Key Takeaways

1. **Use `stream()` not `create()`** - Different method for streaming
2. **Process events in a loop** - `for await...of` the stream
3. **Text comes in chunks** - `text_delta` events contain pieces
4. **Tool use interrupts streaming** - Handle the loop, execute, continue
5. **Get final message** - For stop_reason and complete data
6. **Use `process.stdout.write()`** - For output without newlines
7. **Handle errors** - Streams can fail mid-response

---

**Next:** [06-system-prompts.md](./06-system-prompts.md) - Shaping agent behavior *(Coming in Phase 7)*

**Back to:** [learning_summary.md](./learning_summary.md)
