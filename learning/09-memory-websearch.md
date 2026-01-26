# Phase 10: Memory & Web Search

## What You'll Learn

- Long-term memory vs conversation history
- Storing and retrieving facts across sessions
- Web search integration patterns
- Provider abstraction for flexibility

## Key Concepts

### Two Types of Memory

Your agent now has two distinct types of memory:

| Type | Purpose | Persists? | Example |
|------|---------|-----------|---------|
| **Conversation History** | Track the current chat | Session only | "What did I just ask?" |
| **Long-term Memory** | Remember facts about user | Forever | "My name is Wayne" |

**Conversation history** is what you've built in earlier phases - messages in the current session.

**Long-term memory** is new - facts the agent stores and retrieves across different conversations.

### When to Use Each

**Conversation History:**
- Context within current chat
- Follow-up questions
- Referencing earlier messages

**Long-term Memory:**
- User preferences ("I prefer TypeScript")
- Personal facts ("My birthday is March 15")
- Important information ("My project uses React")
- Anything the user explicitly asks to remember

## Memory System

### The MemoryStore Class

```typescript
import { MemoryStore, createMemoryStore } from './persistence/MemoryStore.js';

const memoryStore = createMemoryStore();

// Store a memory
await memoryStore.store('preferences', 'language', 'TypeScript');

// Recall a memory
const lang = await memoryStore.recall('preferences', 'language');
// Returns: 'TypeScript'

// Search memories
const results = await memoryStore.search('Type');
// Returns all memories containing "Type"

// List by category
const prefs = await memoryStore.listByCategory('preferences');
```

### Memory Structure

Each memory has:

```typescript
interface MemoryEntry {
  id: string;        // Unique identifier
  category: string;  // Organization (e.g., "preferences")
  key: string;       // Topic (e.g., "language")
  content: string;   // The actual information
  createdAt: Date;
  updatedAt: Date;
}
```

### Categories for Organization

Suggested categories:
- `personal` - Name, birthday, location
- `preferences` - Likes, dislikes, settings
- `work` - Job, projects, colleagues
- `facts` - Important information
- `reminders` - Things to remember

### The Memory Tool

The agent uses the memory tool like this:

```typescript
// Agent stores a memory
{
  operation: 'store',
  category: 'personal',
  key: 'name',
  content: 'Wayne'
}

// Agent recalls a memory
{
  operation: 'recall',
  category: 'personal',
  key: 'name'
}
// Returns: { found: true, content: 'Wayne' }

// Agent searches
{
  operation: 'search',
  query: 'favorite'
}
```

## Web Search System

### Why Web Search?

Claude's knowledge has a cutoff date. Web search enables:
- Current events and news
- Real-time prices and data
- Up-to-date documentation
- Verification of facts

### Provider Abstraction

The WebSearchTool uses a provider pattern:

```typescript
interface SearchProvider {
  name: string;
  search(query: string, maxResults?: number): Promise<SearchResult[]>;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}
```

This allows swapping search providers without changing the tool.

### Available Providers

1. **DuckDuckGoProvider** (default)
   - Free, no API key required
   - Returns instant answers
   - Limited but useful for learning

2. **MockSearchProvider**
   - For testing without network
   - Returns simulated results

### Using the Web Search Tool

```typescript
// Agent searches the web
{
  query: 'TypeScript 5.0 new features',
  maxResults: 5
}

// Returns
{
  query: 'TypeScript 5.0 new features',
  resultCount: 3,
  provider: 'duckduckgo',
  results: [
    {
      title: 'TypeScript 5.0 Release Notes',
      url: 'https://...',
      snippet: 'TypeScript 5.0 introduces...',
      source: 'typescriptlang.org'
    },
    // ...
  ]
}
```

### Creating Custom Providers

To add a real search API (like Brave or SerpAPI):

```typescript
import { SearchProvider, SearchResult } from './tools/definitions/WebSearchTool.js';

class BraveSearchProvider implements SearchProvider {
  name = 'brave';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Subscription-Token': this.apiKey,
        },
      }
    );

    const data = await response.json();

    return data.web.results.slice(0, maxResults).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      source: new URL(r.url).hostname,
    }));
  }
}

// Use it
const braveProvider = new BraveSearchProvider(process.env.BRAVE_API_KEY!);
const webSearchTool = createWebSearchTool(braveProvider);
```

## Best Practices

### Memory Best Practices

1. **Use clear categories** - Makes search and organization easier
2. **Use descriptive keys** - `favorite_programming_language` not `fpl`
3. **Store atomic facts** - One fact per memory entry
4. **Let the agent decide** - Don't force memory storage

### When the Agent Should Store Memories

Train your agent (via system prompt) to store when:
- User explicitly asks ("Remember that...")
- Important personal information is shared
- User states a preference
- User corrects a previous assumption

### Web Search Best Practices

1. **Search for specific info** - Not general questions
2. **Use for current events** - News, prices, releases
3. **Verify important facts** - When accuracy matters
4. **Limit results** - 3-5 is usually enough

## Exercises

### Exercise 1: Memory Categories

Design a category system for a personal assistant that helps with:
- Health and fitness tracking
- Recipe management
- Travel planning

What categories would you create?

### Exercise 2: Search Provider

Implement a provider that uses Wikipedia's API:

```typescript
class WikipediaProvider implements SearchProvider {
  name = 'wikipedia';

  async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    // Hint: Use https://en.wikipedia.org/w/api.php
    // with action=opensearch
  }
}
```

### Exercise 3: Memory Summarizer

Create a function that generates a summary of all memories:

```typescript
async function summarizeMemories(store: MemoryStore): Promise<string> {
  // Get all categories
  // For each category, list memories
  // Format as readable summary
}
```

## Integration with Agent

Both tools are registered automatically in `src/index.ts`:

```typescript
const memoryTool = createMemoryTool();
const webSearchTool = createWebSearchTool();

const agent = createAgent(
  { enableTools: true },
  [calculator, fileSystem, taskTool, memoryTool, webSearchTool]
);
```

## Testing the Tools

### Test Memory

```
You: Remember that my favorite color is blue
Agent: [Uses memory tool to store]
       I'll remember that your favorite color is blue!

You: What's my favorite color?
Agent: [Uses memory tool to recall]
       Your favorite color is blue.
```

### Test Web Search

```
You: What's the current version of Node.js?
Agent: [Uses web_search tool]
       According to my search, the current LTS version of Node.js is...
```

## Quick Reference

### Memory Operations

| Operation | Required Fields | Description |
|-----------|-----------------|-------------|
| `store` | category, key, content | Save a memory |
| `recall` | category, key | Get specific memory |
| `search` | query | Find memories by text |
| `list` | category (optional) | List memories/categories |
| `delete` | category, key | Remove a memory |

### Storage Location

- Memories: `data/memory/memories.json`
- Persists across sessions
- Human-readable JSON format

## What's Next?

In **Phase 11 (Production Readiness)**, you'll learn to:
- Add retry logic for API failures
- Handle rate limits gracefully
- Write tests for non-deterministic systems
- Add proper logging and observability

The memory and web search tools need robust error handling for production use!
