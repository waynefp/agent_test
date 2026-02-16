/**
 * Agent API Server
 *
 * Lightweight Express server that exposes the Agent SDK via HTTP API.
 * Runs locally for development, can be deployed separately for production.
 *
 * This is the clean architecture for connecting web UI to the agent:
 * - Web UI (Next.js) → HTTP → Agent API Server (Express) → Agent SDK
 *
 * Benefits:
 * - No import issues between projects
 * - Proper separation of concerns
 * - Deploy frontend and backend independently
 * - Same architecture locally and in production
 */

import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.js';

const app = express();
const PORT = process.env.API_PORT || 4000;

// Middleware
app.use(cors()); // Allow requests from web UI
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Agent API Server is running' });
});

// API routes
app.use('/api/chat', chatRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Agent API Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Chat endpoint: http://localhost:${PORT}/api/chat`);
});
