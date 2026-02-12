# Phase 16: Extended Thinking

## Overview

Extended Thinking is a powerful feature in Claude that enables step-by-step reasoning before providing final answers. When enabled, Claude outputs its internal thought process in `<thinking>` blocks, showing how it arrives at conclusions for complex tasks.

## What is Extended Thinking?

Extended Thinking allows Claude to "think out loud" before responding. Instead of jumping straight to an answer, Claude first reasons through the problem step-by-step, then provides a final answer based on that reasoning.

**Example:**

```
User: "What's 847 × 293?"

Claude's Thinking (internal):
<thinking>
Let me break this down:
847 × 293
= 847 × (300 - 7)
= (847 × 300) - (847 × 7)
= 254,100 - 5,929
= 248,171
</thinking>

Claude's Response (visible):
"The answer is 248,171."
```

## How It Works

### Architecture

Extended thinking is configured at three levels:

1. **Global defaults** (`.env` file)
2. **Agent configuration** (per-agent settings)
3. **Agent roles** (multi-agent patterns)

### Configuration Parameters

- **`thinkingEnabled`**: Boolean flag to enable/disable thinking
- **`thinkingBudgetTokens`**: Number of tokens allocated for reasoning (default: 10,000)

### Token Budget

The thinking budget controls how many tokens Claude can use for internal reasoning:

- **Low budget (1,000-5,000 tokens)**: Brief reasoning, quick tasks
- **Medium budget (5,000-10,000 tokens)**: Balanced reasoning (default)
- **High budget (10,000-20,000 tokens)**: Deep reasoning, complex tasks

**Important:** Thinking tokens count toward your total token usage and costs!

## When to Use Extended Thinking

### Good Use Cases

1. **Mathematical calculations** - Multi-step arithmetic, algebra, calculus
2. **Logic puzzles** - Deduction, inference, problem-solving
3. **Planning tasks** - Breaking down complex projects, sequencing steps
4. **Fact-checking** - Verifying claims, cross-referencing sources
5. **Code debugging** - Tracing execution paths, identifying edge cases
6. **Complex analysis** - Evaluating trade-offs, comparing options

### When NOT to Use It

1. **Simple questions** - "What time is it?" doesn't need reasoning
2. **Creative writing** - Stories and poems don't benefit from visible reasoning
3. **Quick lookups** - Factual queries that don't require analysis
4. **Time-sensitive tasks** - Thinking adds latency
5. **Cost-sensitive applications** - Thinking uses additional tokens

## Implementation

### 1. Environment Variables

Add to your `.env` file:

```env
# Extended Thinking (Phase 16)
THINKING_ENABLED=false          # Off by default
THINKING_BUDGET_TOKENS=10000    # 10K token budget
```

### 2. Agent Configuration

```typescript
import { createAgent } from './agent/Agent.js';

const agent = createAgent({
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 8192,

  // Enable thinking
  thinkingEnabled: true,
  thinkingBudgetTokens: 10000,
});
```

### 3. Multi-Agent Roles

```typescript
import { WorkerAgent } from './multi-agent/WorkerAgent.js';
import type { AgentRole } from './multi-agent/types.js';

const factCheckerRole: AgentRole = {
  id: 'fact-checker',
  name: 'Fact Checker',
  systemPrompt: 'You verify claims and check facts carefully.',

  // Enable thinking for this agent only
  thinkingEnabled: true,
  thinkingBudgetTokens: 5000,
};

const factChecker = new WorkerAgent(factCheckerRole);
```

## CLI Commands

### `/thinking`

Toggle extended thinking on/off for the current session:

```
You: /thinking
System: Extended thinking enabled
System: Token budget: 10000 tokens
System: Claude will show step-by-step reasoning before responses.

You: /thinking
System: Extended thinking disabled
```

### `/thinking-budget <tokens>`

Set the thinking token budget:

```
You: /thinking-budget 5000
System: Thinking budget set to 5000 tokens

You: /thinking-budget
System: Current thinking budget: 5000 tokens
System: Usage: /thinking-budget <tokens>
System: Example: /thinking-budget 5000
```

**Valid range:** 1,000 to 100,000 tokens

## Viewing Thinking Output

Thinking blocks are logged at the **DEBUG** level. To see them, set your log level:

```env
LOG_LEVEL=debug
```

When thinking is used, you'll see output like:

```
[Agent] Extended thinking used:
[Thinking] Let me break down this calculation step-by-step...
[Thinking] First, I'll multiply 847 by 300 to get 254,100...
[Thinking] Then subtract 847 × 7 = 5,929...
[Thinking] Final answer: 248,171
```

## Best Practices

### 1. Use Selectively

Only enable thinking for tasks that genuinely benefit from step-by-step reasoning. Don't enable it globally - turn it on/off per task or per agent.

### 2. Optimize Budget Sizes

- **Simple reasoning**: 2,000-5,000 tokens
- **Moderate complexity**: 5,000-10,000 tokens
- **Deep analysis**: 10,000-20,000 tokens

Start with the default (10K) and adjust based on results.

### 3. Combine with Appropriate Models

- **Haiku + Thinking**: Great for cost-optimized fact-checking
- **Sonnet + Thinking**: Best balance for complex reasoning
- **Opus + Thinking**: Maximum reasoning power (expensive!)

### 4. Multi-Agent Patterns

Enable thinking for specific agents in your pipeline:

```typescript
// Research agents: No thinking (just gather data)
const researchAgent: AgentRole = {
  // ... config
  thinkingEnabled: false,
};

// Fact-checker agent: Use thinking to verify
const factChecker: AgentRole = {
  // ... config
  thinkingEnabled: true,
  thinkingBudgetTokens: 5000,
};

// Writer agent: No thinking (creative task)
const writer: AgentRole = {
  // ... config
  thinkingEnabled: false,
};
```

### 5. Monitor Costs

Thinking tokens are billable! Track your token usage:

```
You: /stats
System: Agent Statistics
System: Messages: 10
System: Tool calls: 5
System: Total tokens: 45,238  ← Includes thinking tokens!
```

## Example Use Cases

### Example 1: Math Problem

```typescript
agent.config.thinkingEnabled = true;
agent.config.thinkingBudgetTokens = 5000;

const response = await agent.chat(
  "If I invest $10,000 at 7% annual interest compounded monthly, " +
  "how much will I have after 5 years?"
);

// Claude will show compound interest calculation steps
```

### Example 2: Fact-Checking Pipeline

```typescript
const briefingPipeline = new AgentChain([
  researchAgent1,  // No thinking - just search
  researchAgent2,  // No thinking - just search
  combiner,        // No thinking - just merge text

  // Only fact-checker uses thinking to verify claims
  factChecker,     // Thinking enabled!

  writer,          // No thinking - creative writing
]);
```

### Example 3: Debugging Help

```typescript
agent.config.thinkingEnabled = true;
agent.config.thinkingBudgetTokens = 10000;

const response = await agent.chat(
  "Why is this function returning undefined?\n\n" +
  "[paste code here]"
);

// Claude will trace execution flow and identify the bug
```

## Performance Considerations

### Latency

Extended thinking adds processing time:
- Small budget (2K tokens): ~1-2 seconds
- Medium budget (10K tokens): ~3-5 seconds
- Large budget (20K tokens): ~6-10 seconds

Use thinking when **correctness matters more than speed**.

### Costs

Thinking tokens are billed at normal rates:
- Sonnet: ~$3 per million input tokens, ~$15 per million output tokens
- 10K thinking tokens ≈ $0.15 per request (output rate)

For high-volume applications, use thinking sparingly or with Haiku for cost optimization.

## Troubleshooting

### "Thinking blocks not showing"

Make sure your log level is set to DEBUG:

```env
LOG_LEVEL=debug
```

### "Thinking seems truncated"

Increase the thinking budget:

```
/thinking-budget 15000
```

### "Too slow"

Reduce the thinking budget or disable thinking:

```
/thinking-budget 5000
# or
/thinking
```

### "Costs too high"

1. Disable thinking for non-critical tasks
2. Lower the thinking budget
3. Use Haiku instead of Sonnet for thinking tasks

## Real-World Example: Daily Briefing Fact-Checker

The Daily Briefing app uses thinking for fact-checking:

```typescript
const factCheckerAgent: AgentRole = {
  id: 'fact-checker',
  name: 'Fact Checker',
  systemPrompt: '...',
  model: 'haiku',              // Cost optimization
  thinkingEnabled: true,       // Verify reasoning
  thinkingBudgetTokens: 5000,  // Modest budget
};
```

This configuration:
- Uses cheap Haiku model
- Enables thinking to verify claims step-by-step
- Keeps budget modest (5K tokens) for cost control
- Only fact-checks stories without Perplexity citations (saves ~90% tokens)

## Summary

Extended Thinking is a powerful tool for complex reasoning tasks. Use it when:
- Correctness is critical
- The task requires step-by-step logic
- You want to see Claude's reasoning process
- You can afford the latency and token costs

Avoid it when:
- Tasks are simple or creative
- Speed is critical
- Costs need to be minimized
- The task doesn't benefit from visible reasoning

**Rule of thumb:** If you'd want to see a human's work on scratch paper, enable thinking. If not, leave it off.
