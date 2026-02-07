/**
 * Agent Router Pattern (Handoff/Routing)
 *
 * Routes tasks to the right specialist agent based on classification.
 *
 * ```
 *          ┌──────────┐
 *          │  Router  │
 *          └────┬─────┘
 *     ┌─────────┼─────────┐
 *     v         v         v
 * ┌────────┐ ┌────────┐ ┌────────┐
 * │ Sales  │ │Support │ │Billing │
 * │ Agent  │ │ Agent  │ │ Agent  │
 * └────────┘ └────────┘ └────────┘
 * ```
 *
 * BEGINNER NOTE: Like calling a company and being transferred to the
 * right department. The router classifies your request and sends it
 * to the specialist who can best help.
 *
 * When to use: Classification-based routing, different expertise areas
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
 * Router Pattern - Classify and route to the right agent
 *
 * BEGINNER NOTE: The router agent classifies the input, then
 * the task is handed off to the appropriate specialist.
 */
export class AgentRouter {
  private router: WorkerAgent;
  private agents: Map<string, WorkerAgent>;
  private defaultAgentId: string | null;

  /**
   * Create a router
   * @param routerRole - The classifier agent's role
   * @param agentRoles - Map of category names to agent roles
   * @param defaultAgentId - Which agent to use if classification fails
   */
  constructor(
    routerRole: AgentRole,
    agentRoles: AgentRole[],
    defaultAgentId?: string
  ) {
    this.router = new WorkerAgent(routerRole);
    this.agents = new Map(
      agentRoles.map((role) => [role.id, new WorkerAgent(role)])
    );
    this.defaultAgentId = defaultAgentId || agentRoles[0]?.id || null;
  }

  /**
   * Route a task to the right agent
   *
   * BEGINNER NOTE: The flow is:
   * 1. Router agent classifies the input
   * 2. Based on classification, route to the specialist
   * 3. Specialist handles the task
   *
   * @param task - The task/query to route
   * @param callbacks - Optional progress callbacks
   * @returns The pipeline result
   */
  async run(task: string, callbacks?: PipelineCallbacks): Promise<PipelineResult> {
    const startTime = Date.now();
    const agentResults: AgentResult[] = [];
    const errors: string[] = [];

    logger.info(`[Router] Classifying task...`);

    // Step 1: Classify
    callbacks?.onAgentStart?.(this.router.getId(), this.router.getName());

    const categories = Array.from(this.agents.keys());
    const classifyResult = await this.router.run(
      `Classify this request into exactly ONE of these categories: ${categories.join(', ')}

Respond with ONLY the category name, nothing else.

Request: ${task}`
    );

    agentResults.push(classifyResult);
    callbacks?.onAgentComplete?.(classifyResult);

    if (!classifyResult.success) {
      errors.push(`Router classification failed: ${classifyResult.error}`);
    }

    // Step 2: Find the right agent
    const category = classifyResult.output.trim().toLowerCase();
    let targetAgent = this.agents.get(category);

    // Try fuzzy matching if exact match fails
    if (!targetAgent) {
      for (const [key, agent] of this.agents) {
        if (
          category.includes(key.toLowerCase()) ||
          key.toLowerCase().includes(category)
        ) {
          targetAgent = agent;
          break;
        }
      }
    }

    // Fall back to default
    if (!targetAgent && this.defaultAgentId) {
      targetAgent = this.agents.get(this.defaultAgentId) || undefined;
      logger.warn(
        `[Router] Category "${category}" not matched, using default: ${this.defaultAgentId}`
      );
    }

    if (!targetAgent) {
      return {
        output: `Could not route request. Classification: "${category}"`,
        agentResults,
        totalDuration: Date.now() - startTime,
        totalTokens: agentResults.reduce((sum, r) => sum + r.tokensUsed, 0),
        success: false,
        errors: [...errors, `No agent found for category: ${category}`],
      };
    }

    // Step 3: Hand off to the specialist
    logger.info(
      `[Router] Routing to: ${targetAgent.getName()} (category: ${category})`
    );
    callbacks?.onAgentStart?.(targetAgent.getId(), targetAgent.getName());

    const handoffResult = await targetAgent.run(task);
    agentResults.push(handoffResult);
    callbacks?.onAgentComplete?.(handoffResult);

    if (!handoffResult.success) {
      errors.push(`${targetAgent.getName()} failed: ${handoffResult.error}`);
    }

    const totalDuration = Date.now() - startTime;
    const totalTokens = agentResults.reduce((sum, r) => sum + r.tokensUsed, 0);

    const result: PipelineResult = {
      output: handoffResult.output,
      agentResults,
      totalDuration,
      totalTokens,
      success: handoffResult.success,
      errors,
    };

    callbacks?.onPipelineComplete?.(result);

    logger.info(
      `[Router] Complete in ${totalDuration}ms | ${totalTokens} tokens`
    );

    return result;
  }

  /** Get available categories */
  getCategories(): string[] {
    return Array.from(this.agents.keys());
  }
}

/**
 * Factory function
 */
export function createAgentRouter(
  routerRole: AgentRole,
  agentRoles: AgentRole[],
  defaultAgentId?: string
): AgentRouter {
  return new AgentRouter(routerRole, agentRoles, defaultAgentId);
}
