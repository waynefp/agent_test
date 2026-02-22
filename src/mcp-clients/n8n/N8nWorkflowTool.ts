/**
 * n8n Workflow Tool Wrapper
 *
 * Wraps n8n workflows as Agent SDK tools.
 * Each n8n workflow becomes a callable tool for the agent.
 *
 * BEGINNER NOTE: This is the "glue" that makes n8n workflows look like
 * native agent tools (like Calculator or WebSearch).
 */

import { z } from 'zod';
import { BaseTool } from '../../tools/definitions/BaseTool.js';
import type { ToolResult } from '../../types/tool.types.js';
import type { N8nMcpClient } from './N8nMcpClient.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Dynamically create a tool class for an n8n workflow
 */
export function createN8nWorkflowTool(
  mcpTool: Tool,
  n8nClient: N8nMcpClient
): typeof BaseTool {
  // Convert MCP schema to Zod schema
  // BEGINNER NOTE: n8n provides JSON schema, we convert to Zod for type safety
  const inputSchema = mcpTool.inputSchema
    ? convertJsonSchemaToZod(mcpTool.inputSchema)
    : z.object({});

  // Create dynamic tool class
  class N8nWorkflowTool extends BaseTool {
    name = mcpTool.name;
    description = mcpTool.description || `Execute n8n workflow: ${mcpTool.name}`;
    inputSchema = inputSchema;

    async execute(input: z.infer<typeof inputSchema>): Promise<ToolResult> {
      try {
        // Call n8n workflow via MCP
        const result = await n8nClient.callTool(mcpTool.name, input);

        return {
          success: true,
          data: result.content,
          metadata: {
            workflowName: mcpTool.name,
            source: 'n8n-mcp',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            workflowName: mcpTool.name,
            source: 'n8n-mcp',
          },
        };
      }
    }
  }

  return N8nWorkflowTool;
}

/**
 * Convert JSON Schema to Zod schema
 * BEGINNER NOTE: This is a simplified converter. In production, you'd use a library.
 */
function convertJsonSchemaToZod(jsonSchema: any): z.ZodTypeAny {
  // Handle object schema
  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [key, propSchema] of Object.entries<any>(jsonSchema.properties)) {
      shape[key] = convertPropertyToZod(propSchema);
    }

    return z.object(shape);
  }

  // Fallback: accept any object
  return z.object({}).passthrough();
}

/**
 * Convert individual property to Zod type
 */
function convertPropertyToZod(propSchema: any): z.ZodTypeAny {
  switch (propSchema.type) {
    case 'string':
      return z.string().describe(propSchema.description || '');
    case 'number':
    case 'integer':
      return z.number().describe(propSchema.description || '');
    case 'boolean':
      return z.boolean().describe(propSchema.description || '');
    case 'array':
      return z.array(z.any()).describe(propSchema.description || '');
    case 'object':
      return z.object({}).passthrough().describe(propSchema.description || '');
    default:
      return z.any().describe(propSchema.description || '');
  }
}

/**
 * Create tool instances for all n8n workflows
 */
export function createN8nWorkflowTools(n8nClient: N8nMcpClient): BaseTool[] {
  const mcpTools = n8nClient.getAvailableTools();
  const tools: BaseTool[] = [];

  for (const mcpTool of mcpTools) {
    const ToolClass = createN8nWorkflowTool(mcpTool, n8nClient);
    tools.push(new ToolClass());
  }

  return tools;
}
