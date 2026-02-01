# Phase 14: MCP (Model Context Protocol)

## What You'll Learn

- What MCP is and why it matters
- MCP architecture: clients, servers, and transports
- Building your own MCP server
- Exposing custom tools through MCP
- Connecting Claude to MCP servers
- Best practices and security considerations

---

## What is MCP?

**Model Context Protocol (MCP)** is an open standard that lets AI assistants like Claude connect to external data sources and tools through a unified interface.

### The Problem MCP Solves

Without MCP:
```
Your App → Custom integration → Service A
Your App → Different integration → Service B
Your App → Another integration → Service C
```

With MCP:
```
Your App → MCP → Service A
               → Service B
               → Service C
```

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Standardized** | One protocol for all integrations |
| **Reusable** | Build once, use everywhere |
| **Secure** | Clear permission boundaries |
| **Composable** | Mix and match servers |

---

## MCP Architecture

### Three Core Components

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Transport  │────▶│   Server    │
│  (Claude)   │◀────│  (stdio/ws) │◀────│  (Your Code)│
└─────────────┘     └─────────────┘     └─────────────┘
```

**1. MCP Client** - The AI assistant (Claude, your agent)
- Discovers available tools
- Sends requests to servers
- Processes responses

**2. MCP Server** - Your custom service
- Exposes tools (functions Claude can call)
- Exposes resources (data Claude can read)
- Handles requests from clients

**3. Transport** - How they communicate
- `stdio` - Standard input/output (most common)
- `HTTP/WebSocket` - Network-based

### What Servers Can Expose

| Type | Description | Example |
|------|-------------|---------|
| **Tools** | Functions to execute | `search_database`, `send_email` |
| **Resources** | Data to read | Files, database records, API data |
| **Prompts** | Reusable prompt templates | Code review template |

---

## Building Your First MCP Server

Let's create a simple MCP server that provides weather information.

### Step 1: Project Setup

Create a new directory for MCP servers:

```bash
mkdir -p src/mcp-servers/weather
```

### Step 2: Install MCP SDK

```bash
npm install @modelcontextprotocol/sdk
```

### Step 3: Create the Server

```typescript
// src/mcp-servers/weather/index.ts

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Create the MCP server
const server = new McpServer({
  name: 'weather-server',
  version: '1.0.0',
});

// Define a tool
server.tool(
  'get_weather',
  'Get current weather for a location',
  {
    // Input schema (JSON Schema format)
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or zip code',
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        default: 'fahrenheit',
      },
    },
    required: ['location'],
  },
  async ({ location, units = 'fahrenheit' }) => {
    // In a real server, you'd call a weather API here
    // This is a mock response for learning
    const temp = units === 'celsius' ? 22 : 72;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            location,
            temperature: temp,
            units,
            conditions: 'Partly cloudy',
            humidity: '45%',
          }, null, 2),
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Weather MCP server running on stdio');
}

main().catch(console.error);
```

### Step 4: Configure for Claude

Add to your Claude config (`.claude/mcp.json` or Claude Desktop config):

```json
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["ts-node", "src/mcp-servers/weather/index.ts"]
    }
  }
}
```

---

## MCP Server Patterns

### Pattern 1: Database Access

```typescript
server.tool(
  'query_database',
  'Run a read-only SQL query',
  {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'SQL SELECT query' },
    },
    required: ['query'],
  },
  async ({ query }) => {
    // Validate it's a SELECT query (security!)
    if (!query.trim().toLowerCase().startsWith('select')) {
      throw new Error('Only SELECT queries allowed');
    }

    // Execute query (pseudo-code)
    const results = await db.query(query);

    return {
      content: [{ type: 'text', text: JSON.stringify(results) }],
    };
  }
);
```

### Pattern 2: API Integration

```typescript
server.tool(
  'search_github',
  'Search GitHub repositories',
  {
    type: 'object',
    properties: {
      query: { type: 'string' },
      language: { type: 'string' },
    },
    required: ['query'],
  },
  async ({ query, language }) => {
    const url = new URL('https://api.github.com/search/repositories');
    url.searchParams.set('q', language ? `${query} language:${language}` : query);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });

    const data = await response.json();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data.items.slice(0, 5).map(r => ({
          name: r.full_name,
          description: r.description,
          stars: r.stargazers_count,
          url: r.html_url,
        })), null, 2),
      }],
    };
  }
);
```

### Pattern 3: File System Access

```typescript
server.tool(
  'read_config',
  'Read a configuration file',
  {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        enum: ['package.json', 'tsconfig.json', '.env.example'],
      },
    },
    required: ['filename'],
  },
  async ({ filename }) => {
    // Only allow specific files (security!)
    const allowed = ['package.json', 'tsconfig.json', '.env.example'];
    if (!allowed.includes(filename)) {
      throw new Error(`File not allowed: ${filename}`);
    }

    const content = await fs.readFile(filename, 'utf-8');

    return {
      content: [{ type: 'text', text: content }],
    };
  }
);
```

---

## Exposing Resources

Resources are read-only data that Claude can access:

```typescript
// List available resources
server.resource(
  'config://app',
  'Application configuration',
  async () => {
    return {
      contents: [{
        uri: 'config://app',
        mimeType: 'application/json',
        text: JSON.stringify({
          appName: 'My Agent',
          version: '1.0.0',
          environment: process.env.NODE_ENV,
        }),
      }],
    };
  }
);

// Dynamic resources with templates
server.resourceTemplate(
  'file://{path}',
  'Read a project file',
  async ({ path }) => {
    const content = await fs.readFile(path, 'utf-8');
    return {
      contents: [{
        uri: `file://${path}`,
        mimeType: 'text/plain',
        text: content,
      }],
    };
  }
);
```

---

## Connecting to Existing MCP Servers

You already have MCP servers connected! Check your current setup:

### Your Connected Servers

Based on your setup, you have:
- **n8n MCP** - Execute n8n workflows
- **Vercel MCP** - Deploy and manage Vercel projects

### Adding More Servers

Popular MCP servers you can add:

| Server | Purpose | Install |
|--------|---------|---------|
| `@modelcontextprotocol/server-filesystem` | File access | npm install |
| `@modelcontextprotocol/server-github` | GitHub integration | npm install |
| `@modelcontextprotocol/server-postgres` | Database queries | npm install |
| `@modelcontextprotocol/server-slack` | Slack messages | npm install |

### Configuration Example

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-token-here"
      }
    }
  }
}
```

---

## Security Best Practices

### 1. Validate All Inputs

```typescript
server.tool('process_data', '...', schema, async (input) => {
  // Always validate!
  if (typeof input.query !== 'string') {
    throw new Error('Invalid input type');
  }

  // Sanitize
  const sanitized = input.query.replace(/[<>]/g, '');

  // Process...
});
```

### 2. Limit Scope

```typescript
// BAD: Full file system access
server.tool('read_file', '...', schema, async ({ path }) => {
  return fs.readFile(path); // Dangerous!
});

// GOOD: Restricted to specific directory
const ALLOWED_DIR = '/app/data';

server.tool('read_file', '...', schema, async ({ path }) => {
  const fullPath = path.resolve(ALLOWED_DIR, path);

  // Prevent directory traversal
  if (!fullPath.startsWith(ALLOWED_DIR)) {
    throw new Error('Access denied');
  }

  return fs.readFile(fullPath);
});
```

### 3. Use Read-Only Where Possible

```typescript
// Prefer read-only operations
server.tool('search_data', '...'); // Good: read-only
server.tool('delete_data', '...'); // Careful: destructive

// Require confirmation for dangerous operations
server.tool('delete_record', '...', schema, async ({ id, confirm }) => {
  if (confirm !== 'DELETE') {
    throw new Error('Must confirm with "DELETE"');
  }
  // Proceed...
});
```

### 4. Log Everything

```typescript
server.tool('sensitive_action', '...', schema, async (input) => {
  console.error(`[AUDIT] sensitive_action called with: ${JSON.stringify(input)}`);
  // Process...
});
```

---

## Testing Your MCP Server

### Manual Testing

```bash
# Run your server directly
npx ts-node src/mcp-servers/weather/index.ts

# In another terminal, send a test request
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_weather","arguments":{"location":"New York"}},"id":1}' | npx ts-node src/mcp-servers/weather/index.ts
```

### Integration Testing

```typescript
// test/mcp-weather.test.ts
import { McpClient } from '@modelcontextprotocol/sdk/client/index.js';

describe('Weather MCP Server', () => {
  let client: McpClient;

  beforeAll(async () => {
    // Connect to your server
    client = new McpClient({ name: 'test-client', version: '1.0.0' });
    await client.connect(/* transport */);
  });

  test('get_weather returns valid response', async () => {
    const result = await client.callTool('get_weather', {
      location: 'New York',
    });

    expect(result.content[0].type).toBe('text');
    const data = JSON.parse(result.content[0].text);
    expect(data.location).toBe('New York');
  });
});
```

---

## Debugging Tips

### Enable Debug Logging

```bash
# Set debug environment variable
DEBUG=mcp:* npx ts-node src/mcp-servers/weather/index.ts
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Tool not found" | Tool not registered | Check `server.tool()` call |
| "Connection refused" | Server not running | Start server first |
| "Invalid JSON" | Malformed response | Check return format |
| "Timeout" | Slow operation | Add timeout handling |

### Inspect MCP Communication

```typescript
// Add logging to see what's happening
server.onRequest((request) => {
  console.error(`[MCP] Request: ${request.method}`, request.params);
});

server.onResponse((response) => {
  console.error(`[MCP] Response:`, response);
});
```

---

## Quick Reference

### Server Setup

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });

// Add tools
server.tool(name, description, schema, handler);

// Add resources
server.resource(uri, description, handler);

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool Handler Return Format

```typescript
return {
  content: [
    { type: 'text', text: 'Result text' },
    // Or for images:
    { type: 'image', data: base64Data, mimeType: 'image/png' },
  ],
  isError: false, // Optional
};
```

### Configuration (mcp.json)

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["ts-node", "path/to/server.ts"],
      "env": {
        "API_KEY": "value"
      }
    }
  }
}
```

---

## Exercise: Build a Notes MCP Server

Create an MCP server that manages simple notes:

**Requirements:**
1. `create_note` - Create a new note with title and content
2. `list_notes` - List all notes
3. `get_note` - Get a specific note by ID
4. `delete_note` - Delete a note (with confirmation)

**Hints:**
- Store notes in a JSON file
- Generate unique IDs with `crypto.randomUUID()`
- Return structured JSON responses

---

## What's Next?

You now understand MCP and can build custom servers to extend Claude's capabilities!

**Next phases:**
- Phase 15: Multi-Agent Patterns
- Phase 16: Structured Outputs
- Phase 17: Testing & Evaluation

**Explore more:**
- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP Server Examples](https://github.com/modelcontextprotocol/servers)
- Build servers for your specific needs!
