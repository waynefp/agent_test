# Phase 19: Parallel Tool Execution

## Overview

When Claude decides to use multiple tools in a single response, those tools can be executed either **sequentially** (one at a time) or **in parallel** (simultaneously). This phase implements parallel execution to dramatically reduce latency in multi-tool workflows.

## The Problem: Sequential Execution Bottleneck

### Current Behavior (Sequential)

When Claude returns multiple `tool_use` blocks, the SDK executes them one-by-one:

```typescript
// Sequential execution (default)
for (const toolUse of toolUses) {
  await executeAndAddToolResult(toolUse);  // Wait for each to finish
}
```

**Example scenario:**
- Tool 1: Web search (2000ms)
- Tool 2: Calculation (100ms)
- Tool 3: Weather API (1500ms)

**Total time: 2000 + 100 + 1500 = 3600ms**

### The Solution: Parallel Execution

```typescript
// Parallel execution
const results = await executeManyParallel(toolCalls);  // All at once!
```

**Total time: max(2000, 100, 1500) = 2000ms (2.4x faster!)**

## How It Works

### 1. Promise.allSettled

The key to parallel execution is `Promise.allSettled()`, which waits for **all** promises to complete, whether they succeed or fail:

```typescript
async executeManyParallel(toolCalls: Array<{ name: string; input: unknown }>): Promise<ToolUse[]> {
  // Create a promise for each tool
  const promises = toolCalls.map(async (call) => {
    try {
      return await this.executeToolWithMetadata(call.name, call.input);
    } catch (error) {
      // Return a failed result instead of throwing
      return { /* failed ToolUse */ };
    }
  });

  // Wait for ALL to complete
  const settledResults = await Promise.allSettled(promises);

  // Extract results (both successes and failures)
  return settledResults.map(settled => {
    if (settled.status === 'fulfilled') {
      return settled.value;  // Success
    } else {
      return { /* error result */ };  // Failure
    }
  });
}
```

**Why Promise.allSettled instead of Promise.all?**

- `Promise.all()` - **Fails fast** on the first error (rejects entire batch)
- `Promise.allSettled()` - **Waits for all** promises (handles partial failures gracefully)

### 2. Configuration Flag

```typescript
export interface AgentConfig {
  // ... other config

  /**
   * Enable parallel tool execution (default: false)
   */
  enableParallelTools?: boolean;
}
```

**Default is `false`** for backward compatibility and safety.

### 3. Conditional Execution in Agent Loop

```typescript
if (response.stop_reason === 'tool_use') {
  const toolUses = this.extractToolUses(response);

  if (this.config.enableParallelTools && toolUses.length > 1) {
    // PARALLEL: All tools at once
    await this.executeToolsParallel(toolUses);
  } else {
    // SEQUENTIAL: One at a time (default)
    for (const toolUse of toolUses) {
      await this.executeAndAddToolResult(toolUse);
    }
  }

  continue;  // Send results back to Claude
}
```

**Note:** Single tools always run the same way (no overhead).

## When to Use Parallel Execution

### ✅ Good Candidates for Parallel Execution

1. **Multiple web searches** - Independent API calls
2. **Different data sources** - Database + API + file read
3. **Independent calculations** - No shared state
4. **Multiple API endpoints** - Different services

**Example:**
```
User: "Check the weather in NYC, get the stock price of AAPL, and search for news about AI"

Claude returns 3 tool_use blocks:
- weather_api(city="NYC")
- stock_api(symbol="AAPL")
- web_search(query="AI news")

✅ These are independent - run in parallel!
```

### ❌ Bad Candidates (Keep Sequential)

1. **Tools with dependencies** - "Search, then summarize the results"
2. **Ordered operations** - "Create user, then create post for that user"
3. **Shared state modifications** - Multiple tools writing to same database
4. **Transaction requirements** - Must happen in specific order

**Example:**
```
User: "Search for Python tutorials and summarize the top result"

Claude returns 2 tool_use blocks:
- web_search(query="Python tutorials")
- summarize(content=<depends on search result>)

❌ These have dependencies - must run sequentially!
```

**Note:** Claude typically handles dependencies by making separate API calls (search, then summarize), so this is less common. Parallel execution is opt-in to give you control.

## CLI Usage

### Toggle Parallel Execution

```bash
/parallel-tools
```

Toggles between sequential and parallel modes.

**Output when enabled:**
```
✓ Parallel tool execution enabled
  Multiple tools will execute simultaneously for faster responses.
  ⚠️  Only enable if tools are independent (no dependencies)
```

**Output when disabled:**
```
  Parallel tool execution disabled
  Tools will execute sequentially (one at a time).
```

## Code Implementation

### Agent.ts

```typescript
/**
 * Execute multiple tools in parallel and add results to conversation
 */
private async executeToolsParallel(toolUses: ToolUseContent[]): Promise<void> {
  const startTime = Date.now();

  // Prepare tool calls
  const toolCalls = toolUses.map((toolUse) => ({
    name: toolUse.name,
    input: toolUse.input,
  }));

  // Execute all in parallel
  const results = await this.toolExecutor.executeManyParallel(toolCalls);

  // Add all results to conversation (preserving order)
  for (let i = 0; i < toolUses.length; i++) {
    const toolUse = toolUses[i];
    const result = results[i];

    this.conversationManager.addToolResult(
      toolUse.id,  // Must match tool_use ID
      JSON.stringify(result.result),
      !result.result.success
    );

    // Log result
    if (result.result.success) {
      logger.success(`Tool ${toolUse.name} succeeded (parallel)`);
    } else {
      logger.warn(`Tool ${toolUse.name} failed (parallel): ${result.result.error}`);
    }
  }

  const totalTime = Date.now() - startTime;
  logger.success(`All ${toolUses.length} tools completed in ${totalTime}ms (parallel)`);

  this.state.toolCallCount += toolUses.length;
}
```

**Key points:**
1. Calls `executeManyParallel` to run all tools simultaneously
2. Preserves order when adding results (important for ID matching)
3. Logs individual results and total time
4. Updates tool call count

### WorkerAgent.ts

WorkerAgent has a similar implementation with helper methods:

```typescript
private async executeToolsSequential(toolUses: ToolUseBlock[]): Promise<Anthropic.ToolResultBlockParam[]>
private async executeToolsParallel(toolUses: ToolUseBlock[]): Promise<Anthropic.ToolResultBlockParam[]>
```

Both return the same format (array of tool result blocks), making them interchangeable.

## Performance Examples

### Example 1: Web Search Tools

**Scenario:** Search 3 different topics simultaneously

```typescript
// 3 web searches, each takes ~2 seconds

Sequential: 2000 + 2000 + 2000 = 6000ms
Parallel:   max(2000, 2000, 2000) = 2000ms

Speedup: 3x faster ⚡
```

### Example 2: Mixed Tool Types

**Scenario:** Web search + calculation + database query

```typescript
// Different tool speeds

Sequential: 2000 (search) + 100 (calc) + 1500 (db) = 3600ms
Parallel:   max(2000, 100, 1500) = 2000ms

Speedup: 1.8x faster ⚡
```

### Example 3: Many Fast Tools

**Scenario:** 10 calculations (each 100ms)

```typescript
Sequential: 100 * 10 = 1000ms
Parallel:   max(100, 100, ...) = 100ms

Speedup: 10x faster ⚡
```

## Error Handling

### Partial Failures

Parallel execution handles partial failures gracefully:

```typescript
// 3 tools: success, fail, success
const results = await executeManyParallel([tool1, tool2, tool3]);

// Results:
// [0] { success: true, data: {...} }
// [1] { success: false, error: "Tool failed" }
// [2] { success: true, data: {...} }

// All 3 results are sent back to Claude
// Claude sees which succeeded and which failed
```

**Claude can then:**
- Retry failed tools
- Work with partial results
- Ask for clarification

### Promise Rejection

In the rare case a promise rejects (despite our try/catch):

```typescript
const settledResults = await Promise.allSettled(promises);

settledResults.map((settled) => {
  if (settled.status === 'fulfilled') {
    return settled.value;  // Success
  } else {
    // Promise rejection (shouldn't happen, but safety)
    logger.error('Unexpected promise rejection', settled.reason);
    return { /* error result */ };
  }
});
```

## Testing

### Running the Demo

```bash
npm run demo:parallel-tools
```

**Expected output:**
```
SEQUENTIAL EXECUTION TEST
Starting API Call 1 (1000ms delay)...
Completed API Call 1 after 1000ms
Starting Database Query (500ms delay)...
Completed Database Query after 500ms
Starting File Processing (800ms delay)...
Completed File Processing after 800ms

Sequential total time: 2300ms
Expected: ~2300ms (1000 + 500 + 800)

PARALLEL EXECUTION TEST
Starting API Call 1 (1000ms delay)...
Starting Database Query (500ms delay)...
Starting File Processing (800ms delay)...
Completed Database Query after 500ms
Completed File Processing after 800ms
Completed API Call 1 after 1000ms

Parallel total time: 1000ms
Expected: ~1000ms (limited by slowest tool)

Speedup: 2.3x faster
```

### Manual Testing

1. Start the CLI agent: `npm start`
2. Enable parallel tools: `/parallel-tools`
3. Ask Claude to use multiple tools:
   ```
   Search for "AI news", get the weather in NYC, and calculate 123 * 456
   ```
4. Watch the logs - tools run simultaneously!

## Trade-offs

### Pros of Parallel Execution ✅

- **Faster responses** - Dramatically reduced latency
- **Better UX** - Users wait less time
- **Efficient API usage** - No idle time between tools
- **Scalable** - More tools = more benefit

### Cons of Parallel Execution ❌

- **Resource usage** - More concurrent connections
- **Race conditions** - If tools share state (avoid this!)
- **Harder to debug** - Logs are interleaved
- **Not always safe** - Requires independent tools

### Default Choice: Sequential

**Why default to sequential?**
1. **Safety** - No risk of race conditions
2. **Predictability** - Tools run in order
3. **Backward compatibility** - Existing behavior preserved
4. **Debugging** - Easier to follow logs

Users **opt-in** to parallel execution when they understand their tools are independent.

## Real-World Use Cases

### Research Agent

```
User: "Research topic X from multiple sources"

Claude uses:
- perplexity_search("X")
- web_search("X")
- google_trends("X")

✅ Parallel: All searches run simultaneously (3x faster)
```

### Data Aggregation

```
User: "Get my stats from all platforms"

Claude uses:
- github_api(user="me")
- twitter_api(user="me")
- linkedin_api(user="me")

✅ Parallel: All API calls at once
```

### Multi-Agent Pipeline

In the Daily Briefing app (Phase 15):

```typescript
// Research agents run in parallel
const [aiNews, longevityNews] = await ParallelAgents.run([
  { name: 'ai-researcher', model: 'sonnet', tools: [webSearch] },
  { name: 'longevity-researcher', model: 'sonnet', tools: [webSearch] },
]);

// Then sequential processing
const combined = await combinerAgent.run(aiNews + longevityNews);
const checked = await factCheckerAgent.run(combined);
const final = await writerAgent.run(checked);
```

**This uses BOTH patterns:**
- Parallel for independent research
- Sequential for dependent processing

## Best Practices

### 1. Know Your Tools

Before enabling parallel execution, ask:
- Are tools truly independent?
- Do they share state?
- Is there a dependency chain?
- Could they interfere with each other?

### 2. Start Sequential, Optimize Later

```typescript
// Start with this
enableParallelTools: false

// Profile your workload
// Identify independent multi-tool calls
// Then enable for production

enableParallelTools: true
```

### 3. Monitor Performance

```typescript
// Logs show execution time
logger.success(`All 3 tools completed in 1000ms (parallel)`);

// Compare to sequential baseline
// Ensure you're getting expected speedup
```

### 4. Handle Failures Gracefully

```typescript
// Don't assume all tools succeed
const results = await executeManyParallel(toolCalls);

// Check each result
results.forEach(result => {
  if (!result.result.success) {
    logger.warn(`Tool ${result.name} failed: ${result.result.error}`);
  }
});
```

### 5. Document Tool Dependencies

In your tool descriptions, note dependencies:

```typescript
/**
 * SummarizeTool
 *
 * ⚠️  DEPENDENCY: Requires text input from SearchTool
 * Do NOT run in parallel with SearchTool
 */
```

## Future Enhancements

Potential improvements for Phase 20+:

1. **Dependency Graph** - Auto-detect dependencies, run in DAG order
2. **Tool Caching** - Cache results to avoid redundant execution
3. **Configurable Concurrency** - Limit max parallel tools (e.g., max 5 at once)
4. **Priority Queue** - Run high-priority tools first
5. **Streaming Results** - Return results as they complete (don't wait for all)

## Summary

Parallel tool execution is a powerful optimization that can dramatically reduce latency when multiple independent tools are used. By leveraging `Promise.allSettled`, the SDK can run all tools simultaneously while gracefully handling partial failures.

**Key Takeaways:**
- Parallel execution is **opt-in** for safety
- Uses `Promise.allSettled` to handle all tools gracefully
- Best for **independent** tools (no dependencies)
- Can achieve **2-10x speedup** depending on workload
- Toggle with `/parallel-tools` CLI command
- Default remains **sequential** for backward compatibility

**Next Phase:** Tool Caching & Memoization - Cache tool results to avoid redundant execution.
