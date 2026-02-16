/**
 * Chat API Route
 *
 * Exposes the Agent SDK via HTTP streaming endpoint.
 * Handles tool execution, streaming responses, and conversation history.
 */

import express from 'express';
import { Agent } from '../../agent/Agent.js';
import { createWebSearchTool } from '../../tools/definitions/WebSearchTool.js';
import type { AgentConfig } from '../../types/agent.types.js';

export const chatRouter = express.Router();

// POST /api/chat - Stream chat with agent
chatRouter.post('/', async (req, res) => {
  try {
    const { message, conversationHistory = [], persona = 'default' } = req.body;

    console.log('=== CHAT REQUEST DEBUG ===');
    console.log('Message type:', typeof message);
    console.log('Message value:', JSON.stringify(message, null, 2));
    console.log('History length:', conversationHistory.length);
    if (conversationHistory.length > 0) {
      console.log('Last history item:', JSON.stringify(conversationHistory[conversationHistory.length - 1], null, 2));
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Configure agent based on persona
    const config: AgentConfig = getPersonaConfig(persona);

    // Initialize agent with tools
    const agent = new Agent(config);
    agent.registerTool(createWebSearchTool());

    // Build full conversation with properly formatted messages
    // Ensure all messages have content as a string (Agent class will normalize)
    const formattedHistory = conversationHistory.map((msg: any) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }));

    const messages = [
      ...formattedHistory,
      { role: 'user' as const, content: message }
    ];

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let toolsUsed: string[] = [];

    // Stream response from agent
    await agent.chat(messages, {
      onStream: (chunk) => {
        if (chunk.type === 'text') {
          res.write(`data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`);
        }
      },
      onToolUse: (toolName, toolInput) => {
        toolsUsed.push(toolName);
        res.write(`data: ${JSON.stringify({
          type: 'tool_use',
          toolName,
          toolInput: JSON.stringify(toolInput, null, 2)
        })}\n\n`);
      },
      onToolResult: (toolName, result) => {
        res.write(`data: ${JSON.stringify({
          type: 'tool_result',
          toolName,
          success: result.success,
          preview: result.success ? 'Success' : result.error
        })}\n\n`);
      }
    });

    // Send completion event
    res.write(`data: ${JSON.stringify({ type: 'done', toolsUsed })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Chat error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      content: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
    res.end();
  }
});

// Persona configurations
function getPersonaConfig(persona: string): AgentConfig {
  const personas: Record<string, AgentConfig> = {
    default: {
      model: 'claude-sonnet-4-20250514',
      systemPrompt: `You are a helpful AI assistant with access to web search.

When users ask questions that require current information, recent events, or facts you're unsure about, use your web_search tool to find accurate, up-to-date information.

Be conversational, helpful, and cite sources when you use web search.`,
      temperature: 0.7,
      maxTokens: 4096,
    },
    researcher: {
      model: 'claude-sonnet-4-20250514',
      systemPrompt: `You are a research assistant specialized in finding and synthesizing information.

Always use web_search to find current, accurate information. Provide detailed answers with citations.
Structure your responses clearly with sources linked.`,
      temperature: 0.5,
      maxTokens: 4096,
    },
    creative: {
      model: 'claude-sonnet-4-20250514',
      systemPrompt: `You are a creative assistant focused on brainstorming and ideation.

Be imaginative and explore diverse possibilities. Use web search when you need inspiration or current examples.
Embrace unconventional thinking and creative solutions.`,
      temperature: 0.9,
      maxTokens: 4096,
    },
    coder: {
      model: 'claude-sonnet-4-20250514',
      systemPrompt: `You are a coding assistant specialized in software development.

Provide clear, well-commented code examples. Use web search to find current best practices, documentation, or solutions.
Focus on clean, maintainable code.`,
      temperature: 0.3,
      maxTokens: 4096,
    },
  };

  return personas[persona] || personas.default;
}
