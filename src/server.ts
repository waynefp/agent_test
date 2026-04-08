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
import { PERSONAS, getPersona, buildSystemPrompt } from './config/personas.js';

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

// Track which persona each session is using
// BEGINNER NOTE: We need this so we can tell the user their current persona
const sessionPersonas = new Map<string, string>();

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
 * Debug endpoint - Shows the last raw message received by /chat
 * BEGINNER NOTE: Useful for debugging what n8n actually sends to the server
 */
let lastRawRequest: Record<string, unknown> = {};
app.get('/debug/last-request', (_req: Request, res: Response) => {
  res.json(lastRawRequest);
});

/**
 * Personas endpoint - List all available personas
 * BEGINNER NOTE: Returns the list of personas so users/n8n can pick one
 */
app.get('/personas', (_req: Request, res: Response) => {
  const personaList = Object.values(PERSONAS).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));
  res.json({ personas: personaList });
});

/**
 * Build a system prompt that combines a persona with tool descriptions
 * BEGINNER NOTE: This merges the persona's "character sheet" with info about available tools
 */
function buildToolAwareSystemPrompt(personaId: string): string {
  const persona = getPersona(personaId);

  // Start with the persona's system prompt (or fall back to default)
  let systemPrompt = persona
    ? buildSystemPrompt(persona.components)
    : buildSystemPrompt(PERSONAS.default.components);

  // Append tool descriptions so the agent knows what it can do
  systemPrompt += `\n\n**Available Tools:**

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

  // Add persona awareness so the agent can tell users about available personas
  const personaList = Object.values(PERSONAS)
    .map((p) => `- **${p.name}** (${p.id}): ${p.description}`)
    .join('\n');

  systemPrompt += `\n\n**Personas:**
You are currently using the **${persona?.name || 'Helpful Assistant'}** persona (id: ${personaId}).

The following personas are available:
${personaList}

When users ask about personas, list all available options above.
Note: To switch personas, users need to start a new session with the desired persona. You cannot switch personas mid-conversation.`;

  return systemPrompt;
}

/**
 * Chat endpoint - Main API for n8n integration
 * BEGINNER NOTE: Accepts a message, session_id, and optional persona, returns agent's response
 */
app.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, session_id = 'default', persona = 'default' }: { message?: string; session_id?: string; persona?: string } = req.body;

    // Capture raw request for debugging
    lastRawRequest = { message, session_id, persona, timestamp: new Date().toISOString() };

    // Validate required fields
    if (!message) {
      res.status(400).json({ error: 'Missing required field: message' });
      return;
    }

    // --- In-chat persona commands ---
    // BEGINNER NOTE: These let users type /personas, /creative, /coder, etc. in Telegram.
    // Telegram appends @BotName to commands (e.g., "/personas@MyBot"), so we strip that.
    const trimmedMessage = message.trim().toLowerCase().replace(/@\S+/, '');

    // /personas - List available personas
    if (trimmedMessage === '/personas' || trimmedMessage === 'personas') {
      const currentPersona = sessionPersonas.get(session_id) || 'default';
      const list = Object.values(PERSONAS)
        .map((p) => `${p.id === currentPersona ? '👉 ' : ''}/${p.id} - ${p.name}: ${p.description}`)
        .join('\n');
      res.json({
        response: `**Available Personas:**\n\n${list}\n\nType a command like /creative or /coder to switch.`,
        session_id,
      });
      return;
    }

    // /persona-id - Switch to a specific persona (e.g., /creative, /coder, /teacher)
    // BEGINNER NOTE: Matches both "/creative" and just "creative" for flexibility
    const commandCandidate = trimmedMessage.startsWith('/') ? trimmedMessage.slice(1) : trimmedMessage;
    if (!commandCandidate.includes(' ')) {
      const requestedPersona = getPersona(commandCandidate);
      if (requestedPersona && trimmedMessage.startsWith('/')) {
        // Only switch on /command form (not bare words that happen to match a persona id)
        sessions.delete(session_id);
        sessionPersonas.set(session_id, commandCandidate);
        console.log(`🔄 [${session_id}] Switched persona to: ${commandCandidate}`);
        res.json({
          response: `Switched to **${requestedPersona.name}** persona. ${requestedPersona.description}.\n\nHow can I help you?`,
          session_id,
        });
        return;
      }
      // Not a persona command — fall through to normal chat
    }

    // Determine which persona to use: session override > request body > default
    const activePersonaId = sessionPersonas.get(session_id) || persona;

    // Validate persona
    const selectedPersona = getPersona(activePersonaId);
    if (!selectedPersona) {
      const validIds = Object.keys(PERSONAS).join(', ');
      res.status(400).json({ error: `Unknown persona: "${activePersonaId}". Valid personas: ${validIds}` });
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

      // Build system prompt from persona + tool descriptions
      const systemPrompt = buildToolAwareSystemPrompt(activePersonaId);

      // CRITICAL: Pass { enableTools: true } - default is false!
      agent = new Agent(
        {
          enableTools: true,
          systemPrompt,
          maxTokens: 4096,
          temperature: selectedPersona.recommendedTemperature ?? 0.7,
        },
        tools
      );
      sessions.set(session_id, agent);
      sessionPersonas.set(session_id, activePersonaId);
      console.log(`✨ Created new agent session: ${session_id} [persona: ${activePersonaId}] (${tools.length} tools)`);
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
    sessionPersonas.clear();
    return res.json({ status: 'ok', message: `Cleared ${count} sessions` });
  }

  if (sessions.has(session_id)) {
    sessions.delete(session_id);
    sessionPersonas.delete(session_id);
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
