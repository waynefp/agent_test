/**
 * Agent Chain Pattern (Pipeline)
 *
 * Agents work in sequence. The output of one becomes the input to the next.
 *
 * ```
 * ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
 * │ Agent 1│───>│ Agent 2│───>│ Agent 3│───>│ Agent 4│
 * │Research│    │ Draft  │    │ Edit   │    │ Format │
 * └────────┘    └────────┘    └────────┘    └────────┘
 * ```
 *
 * BEGINNER NOTE: Like an assembly line - each agent adds value to the
 * work, then passes it along. The final output has been processed by
 * every agent in the chain.
 *
 * When to use: Linear workflows, content pipelines, data transformation
 *
 * Phase 15: Multi-Agent Patterns
 */

import { WorkerAgent } from '../WorkerAgent.js';
import type {
  AgentRole,
  AgentResult,
  PipelineResult,
  PipelineCallbacks,
} from '../types.js';
import { logger } from '../../utils/logger.js';

/**
 * Chain Pattern - Sequential agent pipeline
 *
 * BEGINNER NOTE: Create a chain by defining the agents in order.
 * Each agent receives the previous agent's output as context.
 */
export class AgentChain {
  private agents: WorkerAgent[];

  /**
   * Create a new agent chain
   * @param roles - Array of agent roles, in execution order
   */
  constructor(roles: AgentRole[]) {
    this.agents = roles.map((role) => new WorkerAgent(role));
  }

  /**
   * Run the chain on a task
   *
   * BEGINNER NOTE: The task is given to the first agent. Each subsequent
   * agent receives the original task PLUS the accumulated output from
   * all previous agents.
   *
   * @param task - The initial task/prompt
   * @param callbacks - Optional progress callbacks
   * @returns The pipeline result with final output
   */
  async run(task: string, callbacks?: PipelineCallbacks): Promise<PipelineResult> {
    const startTime = Date.now();
    const agentResults: AgentResult[] = [];
    const errors: string[] = [];
    let currentContext = '';

    logger.info(`[Chain] Starting ${this.agents.length}-step pipeline`);

    for (const agent of this.agents) {
      callbacks?.onAgentStart?.(agent.getId(), agent.getName());

      // Run the agent with accumulated context
      const result = await agent.run(task, currentContext || undefined);
      agentResults.push(result);

      if (!result.success) {
        const errorMsg = `${agent.getName()} failed: ${result.error}`;
        errors.push(errorMsg);
        logger.error(`[Chain] ${errorMsg}`);

        // Stop the chain on failure
        break;
      }

      callbacks?.onAgentComplete?.(result);

      // Accumulate context for the next agent
      // BEGINNER NOTE: Each agent gets to see what all previous agents produced
      currentContext += `\n\n--- ${agent.getName()} Output ---\n${result.output}`;
    }

    const totalDuration = Date.now() - startTime;
    const totalTokens = agentResults.reduce((sum, r) => sum + r.tokensUsed, 0);

    // The final output is the last successful agent's output
    const lastSuccess = [...agentResults].reverse().find((r) => r.success);
    const output = lastSuccess?.output || 'Pipeline failed - no successful output';

    const pipelineResult: PipelineResult = {
      output,
      agentResults,
      totalDuration,
      totalTokens,
      success: errors.length === 0,
      errors,
    };

    callbacks?.onPipelineComplete?.(pipelineResult);

    logger.info(
      `[Chain] Complete in ${totalDuration}ms | ${totalTokens} tokens | ${errors.length} errors`
    );

    return pipelineResult;
  }

  /** Get the number of agents in the chain */
  getAgentCount(): number {
    return this.agents.length;
  }

  /** Get the agent names in order */
  getAgentNames(): string[] {
    return this.agents.map((a) => a.getName());
  }
}

/**
 * Factory function to create an AgentChain
 */
export function createAgentChain(roles: AgentRole[]): AgentChain {
  return new AgentChain(roles);
}
