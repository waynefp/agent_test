# Phase 9: Persistence

## What You'll Learn

- Saving and loading conversations to disk
- JSON serialization and Date handling
- Session management patterns
- File system operations in Node.js

## Key Concepts

### What is Persistence?

**Persistence** means saving data so it survives after the program closes. Without persistence:
- Conversations are lost when you exit
- Users can't resume where they left off
- No history of past interactions

With persistence:
- Save conversations at any time
- Resume conversations later
- Browse and manage conversation history

### The Challenge: Serialization

JavaScript objects can't be directly saved to files. We need to:

1. **Serialize** - Convert objects to a storable format (JSON)
2. **Deserialize** - Convert stored data back to objects

The tricky part? **Dates**. JSON doesn't have a Date type:

```typescript
// Before saving
const conversation = {
  createdAt: new Date('2025-01-25'),  // Date object
};

// After JSON.stringify
const json = '{"createdAt":"2025-01-25T00:00:00.000Z"}';  // String!

// After JSON.parse
const loaded = { createdAt: "2025-01-25T00:00:00.000Z" };  // Still a string!

// We need to restore Date objects manually
loaded.createdAt = new Date(loaded.createdAt);  // Now it's a Date again
```

## Implementation

### The ConversationPersistence Class

```typescript
import { promises as fs } from 'fs';
import path from 'path';

export class ConversationPersistence {
  private dataDir: string;

  constructor(dataDir: string = './data/conversations') {
    this.dataDir = dataDir;
  }

  // Ensure directory exists before saving
  private async ensureDataDir(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  // Save a conversation
  async save(conversation: Conversation): Promise<SaveResult> {
    await this.ensureDataDir();

    const filePath = path.join(this.dataDir, `${conversation.id}.json`);
    const json = JSON.stringify(conversation, null, 2);

    await fs.writeFile(filePath, json, 'utf-8');

    return { success: true, filePath };
  }

  // Load a conversation
  async load(conversationId: string): Promise<LoadResult> {
    const filePath = path.join(this.dataDir, `${conversationId}.json`);
    const json = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(json);

    // Restore Date objects
    const conversation = this.restoreDates(data);

    return { success: true, conversation };
  }
}
```

### Restoring Dates

```typescript
private restoreDates(data: any): Conversation {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    messages: data.messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    })),
  };
}
```

### Listing Saved Conversations

```typescript
async list(): Promise<ConversationMetadata[]> {
  const files = await fs.readdir(this.dataDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  const conversations: ConversationMetadata[] = [];

  for (const file of jsonFiles) {
    const filePath = path.join(this.dataDir, file);
    const json = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(json);

    conversations.push({
      id: data.id,
      title: data.title || 'Untitled',
      messageCount: data.messages?.length || 0,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }

  // Sort by most recent first
  conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return conversations;
}
```

## File System Operations

### Node.js fs/promises API

We use the promises-based fs API for cleaner async code:

```typescript
import { promises as fs } from 'fs';

// Read a file
const content = await fs.readFile('file.txt', 'utf-8');

// Write a file
await fs.writeFile('file.txt', 'content', 'utf-8');

// Create directory (recursive creates parent dirs too)
await fs.mkdir('path/to/dir', { recursive: true });

// List directory contents
const files = await fs.readdir('path/to/dir');

// Delete a file
await fs.unlink('file.txt');

// Check if file exists
try {
  await fs.access('file.txt');
  console.log('File exists');
} catch {
  console.log('File does not exist');
}
```

### Path Safety

Always sanitize user input to prevent path traversal attacks:

```typescript
// BAD - vulnerable to path traversal
const filePath = path.join(dataDir, userInput);
// If userInput is "../../../etc/passwd", bad things happen!

// GOOD - sanitize the input
const sanitizedId = userInput.replace(/[^a-zA-Z0-9-_]/g, '_');
const filePath = path.join(dataDir, `${sanitizedId}.json`);
```

## CLI Commands

### Save Current Conversation

```bash
/save                    # Save with auto-generated title
/save My important chat  # Save with custom title
```

### Load a Conversation

```bash
/sessions                # List all saved conversations
/load abc12345           # Load by ID (first 8 chars usually enough)
```

### Session Management

```bash
/session info            # Show current session info
/session title New Name  # Change the title
/session delete abc123   # Delete a saved conversation
```

## Integration with Agent

The Agent class wraps the persistence operations:

```typescript
class Agent {
  private conversationPersistence: ConversationPersistence;

  async saveConversation(title?: string): Promise<SaveResult> {
    const conversation = this.conversationManager.getConversation();
    return this.conversationPersistence.save(conversation, { title });
  }

  async loadConversation(id: string): Promise<LoadResult> {
    const result = await this.conversationPersistence.load(id);

    if (result.success && result.conversation) {
      // Replace current conversation
      this.conversationManager.setMessages(result.conversation.messages);
      this.state.currentConversationId = result.conversation.id;
    }

    return result;
  }
}
```

## Best Practices

### 1. Generate Meaningful Titles

Auto-generate titles from the first message:

```typescript
private generateTitle(conversation: Conversation): string {
  const firstUserMessage = conversation.messages.find(m => m.role === 'user');

  if (!firstUserMessage) return 'New Conversation';

  const text = getTextContent(firstUserMessage);
  return text.slice(0, 50) + (text.length > 50 ? '...' : '');
}
```

### 2. Preview Text for Listings

Show a preview of the last message:

```typescript
private getPreviewText(messages: Message[]): string {
  if (messages.length === 0) return '(empty)';

  const lastMessage = messages[messages.length - 1];
  const text = getTextContent(lastMessage);

  return text.slice(0, 80) + (text.length > 80 ? '...' : '');
}
```

### 3. Error Handling

Always handle file system errors gracefully:

```typescript
async load(id: string): Promise<LoadResult> {
  try {
    const json = await fs.readFile(filePath, 'utf-8');
    // ...
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { success: false, error: 'Conversation not found' };
    }
    throw error;  // Re-throw unexpected errors
  }
}
```

### 4. Partial ID Matching

Let users type just the first few characters:

```typescript
// User types: /load abc
// System finds: abc12345-6789-...
const sessions = await listSessions();
const match = sessions.find(s => s.id.startsWith(partialId));
```

## Exercises

### Exercise 1: Auto-Save

Implement auto-save that saves the conversation periodically:

```typescript
class AutoSaver {
  private interval: NodeJS.Timeout | null = null;

  start(agent: Agent, intervalMs: number = 60000) {
    this.interval = setInterval(async () => {
      await agent.saveConversation();
      console.log('Auto-saved');
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
```

### Exercise 2: Export to Markdown

Create a function to export conversations as readable Markdown:

```typescript
function exportToMarkdown(conversation: Conversation): string {
  let md = `# ${conversation.title}\n\n`;
  md += `*Created: ${conversation.createdAt.toLocaleString()}*\n\n`;
  md += '---\n\n';

  for (const message of conversation.messages) {
    const role = message.role === 'user' ? '**You**' : '**Assistant**';
    const text = getTextContent(message);
    md += `${role}: ${text}\n\n`;
  }

  return md;
}
```

### Exercise 3: Search Conversations

Implement search across saved conversations:

```typescript
async searchConversations(query: string): Promise<ConversationMetadata[]> {
  const all = await this.list();
  const lowerQuery = query.toLowerCase();

  return all.filter(conv =>
    conv.title.toLowerCase().includes(lowerQuery) ||
    conv.previewText.toLowerCase().includes(lowerQuery)
  );
}
```

## Quick Reference

### Save
```typescript
await agent.saveConversation('My Chat');
```

### Load
```typescript
const result = await agent.loadConversation('abc12345');
if (result.success) {
  console.log('Loaded!');
}
```

### List
```typescript
const sessions = await agent.listSavedConversations();
for (const s of sessions) {
  console.log(`${s.id}: ${s.title}`);
}
```

### Delete
```typescript
await agent.deleteSavedConversation('abc12345');
```

## What's Next?

In **Phase 10 (Memory & Web Search)**, you'll learn to:
- Add long-term memory (remember facts about the user)
- Integrate real web search APIs
- Distinguish between conversation memory and factual memory

This builds on persistence - long-term memory is a specialized form of persistent storage!
