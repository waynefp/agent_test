/**
 * Worker Agent
 *
 * A lightweight agent wrapper for use in multi-agent pipelines.
 * Unlike the full Agent class (which has CLI, persistence, context management),
 * this is a focused "worker" that just talks to Claude and returns results.
 *
 * NOW WITH TOOL SUPPORT! Research agents can use tools like Perplexity
 * (web search) and Google Trends to gather real data.
 *
 * BEGINNER NOTE: Think of this as a specialized employee. The full Agent class
 * is like a manager with all the bells and whistles. A WorkerAgent is a focused
 * specialist that does one job well - and now it can use tools to do it!
 *
 * Phase 15: Multi-Agent Patterns (Upgraded with Tool Support)
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '../config/anthropic.config.js';
import { ANTHROPIC_MODEL, MAX_TOKENS } from '../config/environment.js';
import type { AgentRole, AgentResult } from './types.js';
import { createToolRegistry, ToolRegistry } from '../tools/ToolRegistry.js';
import { createToolExecutor, ToolExecutor } from '../tools/ToolExecutor.js';
import { logger } from '../utils/logger.js';
import { withRetry, DEFAULT_RETRY_CONFIG } from '../utils/retry.js';

/**
 * Shape of a tool_use block from Claude's response
 *
 * BEGINNER NOTE: When Claude wants to use a tool, it returns a content
 * block with type "tool_use" containing the tool name and input.
 */
interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
}

/**
 * A lightweight agent for multi-agent pipelines
 *
 * BEGINNER NOTE: This class wraps the Anthropic API call into a simple
 * "give me a task, I'll return a result" interface. Each WorkerAgent
 * has its own system prompt defining its specialty.
 *
 * If the agent's role includes tools, it runs a mini "agentic loop" -
 * just like the full Agent class, but simpler. Claude can call tools,
 * get results back, and keep working until it has a final answer.
 */
export class WorkerAgent {
  private client: Anthropic;
  private role: AgentRole;
  private toolRegistry: ToolRegistry | null = null;
  private toolExecutor: ToolExecutor | null = null;

  /**
   * Maximum tool loop iterations to prevent runaway agents
   *
   * BEGINNER NOTE: This safety limit prevents an agent from using
   * tools forever. 15 turns is plenty for research tasks.
   */
  private readonly MAX_TOOL_TURNS = 15;

  constructor(role: AgentRole) {
    this.client = getAnthropicClient();
    this.role = role;

    // Set up tool infrastructure if this agent has tools
    // BEGINNER NOTE: Not all agents need tools. Analysis agents just
    // process text. Research agents need tools to fetch real data.
    if (role.tools && role.tools.length > 0) {
      this.toolRegistry = createToolRegistry();
      this.toolRegistry.registerMany(role.tools);
      this.toolExecutor = createToolExecutor(this.toolRegistry);
      logger.info(
        `[${role.name}] Registered ${role.tools.length} tool(s): ${this.toolRegistry.getToolNames().join(', ')}`
      );
    }
  }

  /** Get this agent's role configuration */
  getRole(): AgentRole {
    return this.role;
  }

  /** Get this agent's ID */
  getId(): string {
    return this.role.id;
  }

  /** Get this agent's name */
  getName(): string {
    return this.role.name;
  }

  /**
   * Get the model name for this agent
   *
   * BEGINNER NOTE: Allows individual agents to use different models.
   * For example, fact-checking can use Haiku (cheaper) while research
   * uses Sonnet (smarter). Falls back to the environment default.
   */
  private getModelName(): string {
    if (this.role.model === 'haiku') {
      return 'claude-3-5-haiku-20241022';
    } else if (this.role.model === 'opus') {
      return 'claude-opus-4-20250514';
    } else if (this.role.model === 'sonnet') {
      return 'claude-3-7-sonnet-20250219';
    }
    // Default to environment config if no model specified
    return ANTHROPIC_MODEL;
  }

  /** Check if this agent has tools */
  hasTools(): boolean {
    return this.toolRegistry !== null && this.toolRegistry.getToolCount() > 0;
  }

  /** Get list of tool names this agent can use */
  getToolNames(): string[] {
    return this.toolRegistry?.getToolNames() || [];
  }

  /**
   * Run this agent on a task
   *
   * BEGINNER NOTE: This sends the task to Claude with this agent's
   * specialized system prompt and returns the result.
   *
   * If the agent has tools, it runs a mini agentic loop:
   * 1. Send task to Claude
   * 2. If Claude wants to use a tool → execute it → send result back
   * 3. Repeat until Claude gives a final text answer
   *
   * If the agent has NO tools, it's a single API call (fast!).
   *
   * @param task - The task/prompt to work on
   * @param context - Optional context from previous agents
   * @returns The agent's result
   */
  async run(task: string, context?: string): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      logger.info(`[${this.role.name}] Starting task...`);

      // Build the user message with optional context
      let userMessage = task;
      if (context) {
        userMessage = `${task}\n\n--- Context from previous steps ---\n${context}`;
      }

      // If agent has tools → run the agentic loop
      // If no tools → simple single API call (faster)
      if (this.hasTools()) {
        return await this.runWithTools(userMessage, startTime);
      } else {
        return await this.runSimple(userMessage, startTime);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg =
        error instanceof Error ? error.message : String(error);

      logger.error(`[${this.role.name}] Failed: ${errorMsg}`);

      return {
        agentId: this.role.id,
        output: '',
        success: false,
        error: errorMsg,
        duration,
        tokensUsed: 0,
      };
    }
  }

  /**
   * Simple single-call execution (no tools)
   *
   * BEGINNER NOTE: This is the original behavior - one API call,
   * one response. Used by analysis and compiler agents that don't
   * need tools and just work with the data they're given.
   */
  private async runSimple(
    userMessage: string,
    startTime: number
  ): Promise<AgentResult> {
    // Call Claude with retry logic
    const retryResult = await withRetry(
      () =>
        this.client.messages.create({
          model: this.getModelName(),
          max_tokens: this.role.maxTokens || MAX_TOKENS,
          temperature: this.role.temperature ?? 1.0,
          system: this.role.systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      {
        ...DEFAULT_RETRY_CONFIG,
        onRetry: (attempt, error, _nextDelayMs) => {
          logger.warn(
            `[${this.role.name}] API call failed (attempt ${attempt}): ${error.message}`
          );
        },
      }
    );

    if (!retryResult.success || !retryResult.data) {
      throw new Error(
        `API call failed after ${retryResult.attempts} attempts: ${retryResult.error?.message || 'Unknown error'}`
      );
    }

    const response = retryResult.data;
    const duration = Date.now() - startTime;

    // Extract text from response
    const output = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n\n');

    const tokensUsed =
      response.usage.input_tokens + response.usage.output_tokens;

    logger.info(
      `[${this.role.name}] Completed in ${duration}ms (${tokensUsed} tokens)`
    );

    return {
      agentId: this.role.id,
      output,
      success: true,
      duration,
      tokensUsed,
    };
  }

  /**
   * Agentic loop execution (with tools)
   *
   * BEGINNER NOTE: This is the "mini agentic loop" - a simplified version
   * of what the full Agent class does. The flow is:
   *
   * 1. Send the task + tools to Claude
   * 2. Claude responds - check stop_reason:
   *    - "end_turn" → Done! Return the text.
   *    - "tool_use" → Claude wants to use a tool:
   *      a. Execute the tool
   *      b. Send tool result back to Claude
   *      c. Go back to step 2
   *    - "max_tokens" → Response was too long, return what we have
   * 3. Repeat up to MAX_TOOL_TURNS times (safety limit)
   *
   * This lets research agents actively search the web, query Google
   * Trends, and gather real data to answer their research questions.
   */
  private async runWithTools(
    userMessage: string,
    startTime: number
  ): Promise<AgentResult> {
    // Build the conversation messages (will grow as tools are used)
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userMessage },
    ];

    // Get tools in Anthropic API format
    const tools = this.toolRegistry!.toAnthropicFormat();

    let totalTokensUsed = 0;
    let turnCount = 0;

    // The agentic loop
    while (turnCount < this.MAX_TOOL_TURNS) {
      turnCount++;
      logger.debug(
        `[${this.role.name}] Agentic loop turn ${turnCount}/${this.MAX_TOOL_TURNS}`
      );

      // Call Claude with retry logic
      const retryResult = await withRetry(
        () =>
          this.client.messages.create({
            model: this.getModelName(),
            max_tokens: this.role.maxTokens || MAX_TOKENS,
            temperature: this.role.temperature ?? 1.0,
            system: this.role.systemPrompt,
            messages,
            tools: tools as Anthropic.Tool[],
          }),
        {
          ...DEFAULT_RETRY_CONFIG,
          onRetry: (attempt, error, _nextDelayMs) => {
            logger.warn(
              `[${this.role.name}] API call failed (attempt ${attempt}): ${error.message}`
            );
          },
        }
      );

      if (!retryResult.success || !retryResult.data) {
        throw new Error(
          `API call failed after ${retryResult.attempts} attempts: ${retryResult.error?.message || 'Unknown error'}`
        );
      }

      const response = retryResult.data;

      // Track token usage across all loop iterations
      totalTokensUsed +=
        response.usage.input_tokens + response.usage.output_tokens;

      // Add Claude's response to conversation history
      // BEGINNER NOTE: We need to keep the full conversation so Claude
      // can see its previous tool calls and results
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Check the stop reason
      if (response.stop_reason === 'end_turn') {
        // Claude is done - extract the final text
        const output = this.extractText(response);
        const duration = Date.now() - startTime;

        logger.info(
          `[${this.role.name}] Completed in ${duration}ms (${totalTokensUsed} tokens, ${turnCount} turn(s))`
        );

        return {
          agentId: this.role.id,
          output,
          success: true,
          duration,
          tokensUsed: totalTokensUsed,
        };
      }

      if (response.stop_reason === 'tool_use') {
        // Claude wants to use tools - extract and execute them
        const toolUses = this.extractToolUses(response);

        if (toolUses.length === 0) {
          // Shouldn't happen, but handle gracefully
          logger.warn(
            `[${this.role.name}] stop_reason was tool_use but no tools found`
          );
          const output = this.extractText(response);
          const duration = Date.now() - startTime;
          return {
            agentId: this.role.id,
            output,
            success: true,
            duration,
            tokensUsed: totalTokensUsed,
          };
        }

        // Execute each tool and collect results
        // BEGINNER NOTE: We build an array of tool results that Claude
        // expects in a specific format: { type: "tool_result", tool_use_id, content }
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUses) {
          logger.info(
            `[${this.role.name}] Using tool: ${toolUse.name}`
          );

          try {
            const result = await this.toolExecutor!.executeTool(
              toolUse.name,
              toolUse.input
            );

            const resultString = JSON.stringify(
              result.data || result.error,
              null,
              2
            );

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: resultString,
              is_error: !result.success,
            });

            if (result.success) {
              logger.info(
                `[${this.role.name}] Tool ${toolUse.name} succeeded`
              );
            } else {
              logger.warn(
                `[${this.role.name}] Tool ${toolUse.name} failed: ${result.error}`
              );
            }
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);

            logger.error(
              `[${this.role.name}] Tool ${toolUse.name} error: ${errorMsg}`
            );

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error executing tool: ${errorMsg}`,
              is_error: true,
            });
          }
        }

        // Add tool results to conversation
        // BEGINNER NOTE: Tool results go in a "user" message. This is
        // how the Anthropic API works - tool results are sent as user
        // messages so Claude can see and process them.
        messages.push({
          role: 'user',
          content: toolResults,
        });

        // Continue the loop - Claude will process the tool results
        continue;
      }

      if (response.stop_reason === 'max_tokens') {
        // Response was truncated
        logger.warn(`[${this.role.name}] Response stopped at max_tokens`);
        const output =
          this.extractText(response) + '\n[Response truncated due to length]';
        const duration = Date.now() - startTime;
        return {
          agentId: this.role.id,
          output,
          success: true,
          duration,
          tokensUsed: totalTokensUsed,
        };
      }

      // Unknown stop reason - return what we have
      logger.info(
        `[${this.role.name}] Response stopped: ${response.stop_reason}`
      );
      const output = this.extractText(response);
      const duration = Date.now() - startTime;
      return {
        agentId: this.role.id,
        output,
        success: true,
        duration,
        tokensUsed: totalTokensUsed,
      };
    }

    // Safety limit reached
    logger.warn(
      `[${this.role.name}] Agentic loop reached max turns (${this.MAX_TOOL_TURNS})`
    );

    // Return whatever text we have from the last response
    const duration = Date.now() - startTime;
    return {
      agentId: this.role.id,
      output:
        '[Agent reached maximum tool turns. Partial results may be available above.]',
      success: false,
      error: `Reached max tool turns (${this.MAX_TOOL_TURNS})`,
      duration,
      tokensUsed: totalTokensUsed,
    };
  }

  /**
   * Extract text content from Claude's response
   *
   * BEGINNER NOTE: Claude's response contains "content blocks" - some are
   * text, some are tool_use. This extracts just the text parts.
   */
  private extractText(response: Anthropic.Message): string {
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n\n');
  }

  /**
   * Extract tool use blocks from Claude's response
   *
   * BEGINNER NOTE: When Claude wants to use tools, it includes
   * tool_use blocks in its response. Each block has the tool name,
   * a unique ID, and the input parameters.
   */
  private extractToolUses(response: Anthropic.Message): ToolUseBlock[] {
    const toolUses: ToolUseBlock[] = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        toolUses.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }

    return toolUses;
  }
}

/**
 * Factory function to create a WorkerAgent
 */
export function createWorkerAgent(role: AgentRole): WorkerAgent {
  return new WorkerAgent(role);
}
