# Phase 8: Context Window Management

## What You'll Learn

- Understanding the context window and its limits
- Token counting and estimation
- Strategies for managing long conversations
- Implementing automatic context trimming

## Key Concepts

### The Context Window

Think of the **context window** as Claude's "working memory" - it's the total amount of text Claude can "see" during a conversation. This includes:

1. **System prompt** - The instructions that define the agent's behavior
2. **Conversation history** - All previous messages (user + assistant)
3. **Tool definitions** - The tools available to the agent
4. **Current message** - The new user input

Claude Sonnet has a **200,000 token** context window. While that's large, long conversations can fill it up!

### Why Does This Matter?

When the context gets too full:
- **API errors** - The request will be rejected
- **Cost increases** - More tokens = more expensive
- **Slower responses** - Processing larger contexts takes longer
- **Lost context** - Older, relevant information might get lost

### What Are Tokens?

**Tokens** are the basic units that language models process. They're not exactly characters or words:

- ~4 characters per token (rough estimate)
- ~0.75 words per token
- Common words are often 1 token
- Rare words or code might use multiple tokens

```typescript
// Examples:
"Hello"        // ~1 token
"conversation" // ~2 tokens
"TypeScript"   // ~2 tokens
"anthropic-ai" // ~3 tokens
```

## Token Estimation

We use a simple heuristic for estimation:

```typescript
/**
 * Estimate token count for text
 * ~4 characters per token + overhead
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4) + 4;
}
```

For production, consider using a proper tokenizer library.

## Context Management Strategies

### 1. None Strategy

Do nothing - let the API error if context is too large.

**When to use:** Testing, or when you want full manual control.

```typescript
agent.configureContext({ strategy: 'none' });
```

### 2. Sliding Window Strategy

Remove the oldest messages when approaching the limit.

**How it works:**
1. Monitor token count
2. When threshold reached, remove oldest messages
3. Keep N most recent messages (configurable)

**Pros:** Simple, predictable
**Cons:** Loses early context entirely

```typescript
agent.configureContext({
  strategy: 'sliding_window',
  keepRecentMessages: 10,
  actionThreshold: 0.85  // Act at 85% full
});
```

### 3. Summarization Strategy

Summarize older messages before removing them.

**How it works:**
1. When threshold reached, create summary of old messages
2. Remove old messages
3. Keep summary for reference

**Pros:** Preserves some context about earlier conversation
**Cons:** Summary might lose important details

```typescript
agent.configureContext({ strategy: 'summarize' });
```

## Implementation Details

### The ContextManager Class

```typescript
import {
  ContextManager,
  createContextManager
} from './agent/ContextManager.js';

// Create with defaults
const contextManager = createContextManager();

// Or with custom config
const contextManager = createContextManager({
  maxContextTokens: 100000,  // Lower limit
  strategy: 'sliding_window',
  warningThreshold: 0.7,     // Warn at 70%
  actionThreshold: 0.85,     // Act at 85%
  keepRecentMessages: 10,
});
```

### Key Methods

```typescript
// Get token statistics
const stats = contextManager.getStats(messages);
console.log(`Using ${stats.estimatedTotal} tokens (${stats.percentUsed * 100}%)`);

// Check if action is needed
if (contextManager.needsAction(messages)) {
  // Context is too full
}

// Apply the configured strategy
const { messages: trimmed, result } = contextManager.applyStrategy(messages);
console.log(`Removed ${result.messagesRemoved} messages`);
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxContextTokens` | 190,000 | Maximum tokens (leave buffer below model limit) |
| `strategy` | `sliding_window` | How to handle full context |
| `warningThreshold` | 0.7 | Show warning at this percentage |
| `actionThreshold` | 0.85 | Take action at this percentage |
| `keepRecentMessages` | 10 | Always keep this many recent messages |
| `targetAfterTrim` | 0.5 | Target percentage after trimming |

### Integration with Agent

The Agent automatically manages context before each API call:

```typescript
private async agenticLoop(options?: ChatOptions): Promise<string> {
  while (turnCount < maxTurns) {
    // Check and apply context management
    await this.manageContextIfNeeded();

    // Continue with API call...
  }
}
```

## CLI Commands

```bash
# Show context usage
/context

# Show context configuration
/context config

# Force trim old messages
/context trim

# Change strategy
/context strategy sliding_window
/context strategy summarize
/context strategy none
```

## Best Practices

### 1. Set Appropriate Thresholds

Don't wait until 100% full:
- Warning at 70% gives time to react
- Action at 85% leaves buffer for response

### 2. Choose Strategy Based on Use Case

| Use Case | Recommended Strategy |
|----------|---------------------|
| Customer support | `summarize` - Keep topic context |
| Code assistance | `sliding_window` - Recent code matters most |
| General chat | `sliding_window` - Simple and effective |
| Research | `summarize` - Preserve findings |

### 3. Monitor and Adjust

Use `/context` to monitor usage and adjust thresholds if needed:

```typescript
// For shorter conversations with lots of tool use
agent.configureContext({
  actionThreshold: 0.9,
  keepRecentMessages: 20
});
```

### 4. Consider Cost

More tokens = higher costs. Aggressive trimming saves money:

```typescript
// Cost-conscious configuration
agent.configureContext({
  maxContextTokens: 50000,  // Lower limit
  actionThreshold: 0.7,     // Trim earlier
  targetAfterTrim: 0.3,     // Trim more aggressively
});
```

## Token Statistics

The `TokenStats` interface provides detailed information:

```typescript
interface TokenStats {
  estimatedTotal: number;     // Estimated total tokens
  percentUsed: number;        // Percentage of context used
  remaining: number;          // Tokens remaining
  isWarning: boolean;         // In warning zone
  needsAction: boolean;       // Need to trim
  messageCount: number;       // Number of messages
  avgTokensPerMessage: number; // Average tokens per message
}
```

## Exercises

### Exercise 1: Token Estimation

Implement a more accurate token estimator that handles code differently:

```typescript
function estimateTokensAdvanced(text: string, isCode: boolean): number {
  // Code often uses more tokens per character
  const charsPerToken = isCode ? 3 : 4;
  // Your implementation here
}
```

### Exercise 2: Custom Strategy

Create a "smart" strategy that keeps messages with tool calls:

```typescript
function smartTrim(messages: Message[]): Message[] {
  // Keep messages that contain tool_use or tool_result
  // Remove plain text messages first
  // Your implementation here
}
```

### Exercise 3: Conversation Analyzer

Build a utility that analyzes conversation patterns:

```typescript
function analyzeConversation(messages: Message[]): {
  avgUserMessageLength: number;
  avgAssistantMessageLength: number;
  toolCallPercentage: number;
  estimatedCost: number;
} {
  // Your implementation here
}
```

## Quick Reference

### Check Context Status
```typescript
const status = agent.getContextStatus();
// "Context: 45,000 / 190,000 tokens (24%)"
```

### Get Detailed Stats
```typescript
const stats = agent.getContextStats();
if (stats.isWarning) {
  console.log('Context is getting full!');
}
```

### Configure Context
```typescript
agent.configureContext({
  strategy: 'summarize',
  maxContextTokens: 100000,
  warningThreshold: 0.6
});
```

### Force Trim
```typescript
const result = await agent.trimContext();
console.log(`Freed ${result.tokensFreed} tokens`);
```

## What's Next?

In **Phase 9 (Persistence)**, you'll learn to:
- Save conversations to disk
- Resume conversations later
- Manage multiple sessions

This builds on context management - you'll want to save context state along with conversations!
