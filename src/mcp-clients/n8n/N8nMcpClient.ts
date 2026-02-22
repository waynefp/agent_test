/**
 * n8n MCP Client
 *
 * Connects to n8n's MCP server to expose published workflows as agent tools.
 *
 * BEGINNER NOTE: This lets the agent call any n8n workflow as if it were a built-in tool.
 * n8n workflows become agent capabilities automatically!
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface N8nMcpConfig {
  serverUrl: string; // e.g., "https://n8n.srv1063345.hstgr.cloud/mcp-server/http"
  apiToken: string; // Bearer token for authentication
}

/**
 * n8n MCP Client
 * Discovers and wraps n8n workflows as agent tools
 */
export class N8nMcpClient {
  private client: Client;
  private config: N8nMcpConfig;
  private isConnected: boolean = false;
  private availableTools: Tool[] = [];

  constructor(config: N8nMcpConfig) {
    this.config = config;
    this.client = new Client(
      {
        name: 'agent-sdk-n8n-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  }

  /**
   * Connect to n8n MCP server and discover tools
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Create SSE transport with authentication
      const transport = new SSEClientTransport(
        new URL(this.config.serverUrl),
        {
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
          },
        }
      );

      await this.client.connect(transport);
      this.isConnected = true;

      // Discover available tools (n8n workflows)
      await this.discoverTools();

      console.log(`✅ Connected to n8n MCP server: ${this.config.serverUrl}`);
      console.log(`📋 Discovered ${this.availableTools.length} n8n workflow(s)`);
    } catch (error) {
      console.error('❌ Failed to connect to n8n MCP server:', error);
      throw error;
    }
  }

  /**
   * Discover available tools from n8n
   */
  private async discoverTools(): Promise<void> {
    try {
      const response = await this.client.listTools();
      this.availableTools = response.tools;

      // Log discovered workflows
      if (this.availableTools.length > 0) {
        console.log('📋 Available n8n workflows:');
        this.availableTools.forEach((tool) => {
          console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to discover n8n tools:', error);
      throw error;
    }
  }

  /**
   * Call an n8n workflow
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to n8n MCP server. Call connect() first.');
    }

    try {
      console.log(`🔧 Calling n8n workflow: ${toolName}`, args);

      const response = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      console.log(`✅ n8n workflow completed: ${toolName}`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to call n8n workflow ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Get list of available tools
   */
  getAvailableTools(): Tool[] {
    return this.availableTools;
  }

  /**
   * Check if connected
   */
  isConnectedToN8n(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from n8n MCP server
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      console.log('🔌 Disconnected from n8n MCP server');
    }
  }
}

/**
 * Factory function to create and connect n8n MCP client
 */
export async function createN8nMcpClient(config: N8nMcpConfig): Promise<N8nMcpClient> {
  const client = new N8nMcpClient(config);
  await client.connect();
  return client;
}
