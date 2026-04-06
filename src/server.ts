/**
 * Agent API Server for n8n Integration
 *
 * Simple Express server that exposes the Agent SDK via HTTP for n8n workflows.
 * Supports session-based conversations and tool execution.
 *
 * BEGINNER NOTE: This is a standalone server designed to run on a VPS.
 * n8n workflows can call it via HTTP Request nodes to interact with the agent.
 */

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { Agent } from './agent/Agent.js';
import { createWebSearchTool } from './tools/definitions/WebSearchTool.js';
import { createCalculatorTool } from './tools/definitions/CalculatorTool.js';
import { createFileSystemTool } from './tools/definitions/FileSystemTool.js';
import { createDateTimeTool } from './tools/definitions/DateTimeTool.js';
import { createHttpFetchTool } from './tools/definitions/HttpFetchTool.js';
import { createDatabaseTool } from './tools/definitions/DatabaseTool.js';
import { createCodeExecutionTool } from './tools/definitions/CodeExecutionTool.js';
import { createN8nMcpClient, createN8nWorkflowTools } from './mcp-clients/n8n/index.js';
import type { N8nMcpClient } from './mcp-clients/n8n/index.js';
import type { BaseTool } from './tools/definitions/BaseTool.js';

const app = express();
// BEGINNER NOTE: Default port 3000 for VPS. For local testing with web UI running,
// use: PORT=8080 npm run server to avoid conflicts
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from anywhere (needed for n8n)
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies

// Session storage - Map of session_id to Agent instances
// BEGINNER NOTE: In production, use Redis or a database for persistent sessions
const sessions = new Map<string, Agent>();

// n8n MCP Client - Connects to n8n workflows
// BEGINNER NOTE: This lets the agent call n8n workflows as tools!
let n8nClient: N8nMcpClient | null = null;
let n8nWorkflowTools: BaseTool[] = [];

/**
 * Initialize n8n MCP connection
 * BEGINNER NOTE: This runs once when the server starts
 */
async function initializeN8n(): Promise<void> {
  const N8N_API_TOKEN = process.env.N8N_API_TOKEN;
  const N8N_SERVER_URL = process.env.N8N_SERVER_URL || 'https://n8n.srv1063345.hstgr.cloud/mcp-server/http';

  if (!N8N_API_TOKEN) {
    console.log('⚠️  N8N_API_TOKEN not set - n8n workflows will not be available');
    console.log('   To enable n8n integration, set N8N_API_TOKEN in .env');
    return;
  }

  try {
    console.log('🔌 Connecting to n8n MCP server...');
    n8nClient = await createN8nMcpClient({
      serverUrl: N8N_SERVER_URL,
      apiToken: N8N_API_TOKEN,
    });

    // Create tools from n8n workflows
    n8nWorkflowTools = createN8nWorkflowTools(n8nClient);

    console.log(`✅ n8n MCP connected! ${n8nWorkflowTools.length} workflow(s) available as tools`);
  } catch (error) {
    console.error('❌ Failed to connect to n8n MCP:', error);
    console.log('   Agent will run without n8n workflows');
  }
}

/**
 * Health check endpoint
 * BEGINNER NOTE: n8n can use this to verify the server is running
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Agent API Server is running' });
});

/**
 * Chat endpoint - Main API for n8n integration
 * BEGINNER NOTE: Accepts a message and session_id, returns agent's response
 */
app.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, session_id = 'default' }: { message?: string; session_id?: string } = req.body;

    // Validate required fields
    if (!message) {
      res.status(400).json({ error: 'Missing required field: message' });
      return;
    }

    // Get or create agent for this session
    let agent = sessions.get(session_id);
    if (!agent) {
      // Build tools array (standard tools + n8n workflows)
      const tools: BaseTool[] = [
        createWebSearchTool(),
        createCalculatorTool(),
        createFileSystemTool('/app/workspace'),
        createDateTimeTool(),
        createHttpFetchTool(),
        createDatabaseTool('/app/workspace'),
        createCodeExecutionTool('/app/workspace'),
        ...n8nWorkflowTools, // Add n8n workflows as tools!
      ];

      // Build system prompt based on available tools
      let systemPrompt = `You are a helpful AI assistant with access to various tools:

**Core Tools:**
- Web Search: Use for current information, recent events, or facts
- Calculator: Use for mathematical operations
- File System: Read, write, and list files (restricted to /app/workspace)
- Date/Time: Get current time, format dates, calculate date differences, and perform date arithmetic
- HTTP Fetch: Make HTTP requests to external APIs and web services
- Database: SQLite database for persistent storage and structured data (data persists across restarts)
- Code Execution: Run JavaScript and Python code in a sandboxed environment with timeouts`;

      if (n8nWorkflowTools.length > 0) {
        systemPrompt += `\n\n**n8n Workflow Tools:**`;
        n8nWorkflowTools.forEach((tool) => {
          systemPrompt += `\n- ${tool.name}: ${tool.description}`;
        });
      }

      systemPrompt += `\n\nBe conversational, helpful, and cite sources when you use tools.`;

      // CRITICAL: Pass { enableTools: true } - default is false!
      agent = new Agent(
        {
          enableTools: true,
          systemPrompt,
          maxTokens: 4096,
          temperature: 0.7,
        },
        tools
      );
      sessions.set(session_id, agent);
      console.log(`✨ Created new agent session: ${session_id} (${tools.length} tools)`);
    }

    // Chat with the agent
    // BEGINNER NOTE: agent.chat() returns a string (the assistant's response text)
    console.log(`💬 [${session_id}] User: ${message}`);
    const responseText = await agent.chat(message);

    console.log(`🤖 [${session_id}] Assistant: ${responseText}`);

    // Return response as JSON
    res.json({
      response: responseText,
      session_id,
    });
  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }
});

app.post('/reset', (req, res) => {
  const { session_id = 'default' } = req.body;

  if (session_id === 'all') {
    const count = sessions.size;
    sessions.clear();
    return res.json({ status: 'ok', message: `Cleared ${count} sessions` });
  }

  if (sessions.has(session_id)) {
    sessions.delete(session_id);
    return res.json({ status: 'ok', session_id, message: 'Session cleared' });
  }

  return res.json({ status: 'ok', session_id, message: 'No session found (nothing to clear)' });
});

// Initialize n8n and start server
(async () => {
  // Connect to n8n MCP server
  await initializeN8n();

  // Start Express server
  app.listen(PORT, () => {
    console.log(`\n🤖 Agent API Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Chat endpoint: http://localhost:${PORT}/chat`);
    console.log(`\n📝 Example n8n request body:`);
    console.log(`   { "message": "Hello!", "session_id": "n8n-workflow-1" }`);
  });
})();
