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
      // CRITICAL: Pass { enableTools: true } - default is false!
      // BEGINNER NOTE: This tells the agent to actually use the tools we register
      agent = new Agent(
        {
          enableTools: true, // Required - otherwise tools are never invoked
          systemPrompt: `You are a helpful AI assistant with access to web search, calculator, and file system tools.

When users ask questions that require current information, use your web_search tool.
For calculations, use your calculator tool.
For file operations (read, write, list files), use your file_system tool.

IMPORTANT: File operations are restricted to the /app/workspace directory for security.

Be conversational, helpful, and cite sources when you use tools.`,
          maxTokens: 4096,
          temperature: 0.7,
        },
        [
          // Register tools - using individual imports (not barrel) to avoid CommonJS issues
          createWebSearchTool(),
          createCalculatorTool(),
          createFileSystemTool('/app/workspace'), // Safe workspace directory on VPS
        ]
      );
      sessions.set(session_id, agent);
      console.log(`✨ Created new agent session: ${session_id}`);
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

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Agent API Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Chat endpoint: http://localhost:${PORT}/chat`);
  console.log(`\n📝 Example n8n request body:`);
  console.log(`   { "message": "Hello!", "session_id": "n8n-workflow-1" }`);
});
