/**
 * Parallel Agents Pattern (Fan-out/Fan-in)
 *
 * Multiple agents work simultaneously on different parts of a task.
 * Results are then combined by a "combiner" agent.
 *
 * ```
 *                 ┌──────────┐
 *                 │ Splitter │
 *                 └────┬─────┘
 *            ┌─────────┼─────────┐
 *            v         v         v
 *       ┌────────┐ ┌────────┐ ┌────────┐
 *       │Agent A │ │Agent B │ │Agent C │
 *       │ Part 1 │ │ Part 2 │ │ Part 3 │
 *       └────┬───┘ └────┬───┘ └────┬───┘
 *            └─────────┼─────────┘
 *                 ┌────v─────┐
 *                 │ Combiner │
 *                 └──────────┘
 * ```
 *
 * BEGINNER NOTE: Like assigning a group project - each person researches
 * a different angle, then one person combines everything into the final report.
 *
 * When to use: Independent subtasks, speed optimization, multiple perspectives
 *
 * Phase 15: Multi-Agent Patterns
 */

import { WorkerAgent } from '../WorkerAgent.js';
import type {
  AgentRole,
  PipelineResult,
  PipelineCallbacks,
} from '../types.js';
import { logger } from '../../utils/logger.js';

/**
 * Parallel Pattern - Run agents simultaneously, then combine
 *
 * BEGINNER NOTE: Uses Promise.all() to run agents at the same time.
 * This is much faster than running them one by one!
 */
export class ParallelAgents {
  private workers: WorkerAgent[];
  private combiner: WorkerAgent;

  /**
   * Create a parallel agent group
   * @param workerRoles - Agents that work in parallel
   * @param combinerRole - Agent that combines the results
   */
  constructor(workerRoles: AgentRole[], combinerRole: AgentRole) {
    this.workers = workerRoles.map((role) => new WorkerAgent(role));
    this.combiner = new WorkerAgent(combinerRole);
  }

  /**
   * Run all agents in parallel, then combine results
   *
   * BEGINNER NOTE: All worker agents receive the same task and work
   * simultaneously. The combiner then gets all their outputs to
   * synthesize into a final result.
   *
   * @param task - The task for all agents
   * @param callbacks - Optional progress callbacks
   * @returns The combined pipeline result
   */
  async run(task: string, callbacks?: PipelineCallbacks): Promise<PipelineResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    logger.info(
      `[Parallel] Starting ${this.workers.length} agents in parallel`
    );

    // Notify all agents starting
    for (const worker of this.workers) {
      callbacks?.onAgentStart?.(worker.getId(), worker.getName());
    }

    // Run all workers in parallel
    // BEGINNER NOTE: Promise.all() runs all promises at the same time
    // and waits for ALL of them to finish before continuing
    const workerResults = await Promise.all(
      this.workers.map((worker) => worker.run(task))
    );

    // Notify completions
    for (const result of workerResults) {
      if (!result.success) {
        const agent = this.workers.find((w) => w.getId() === result.agentId);
        errors.push(`${agent?.getName() || result.agentId} failed: ${result.error}`);
      }
      callbacks?.onAgentComplete?.(result);
    }

    // Build context for the combiner
    // BEGINNER NOTE: We format each agent's output so the combiner
    // knows which perspective/angle each result came from
    const combinedContext = workerResults
      .filter((r) => r.success)
      .map((r) => {
        const agent = this.workers.find((w) => w.getId() === r.agentId);
        return `--- ${agent?.getName() || r.agentId} ---\n${r.output}`;
      })
      .join('\n\n');

    // Run the combiner
    callbacks?.onAgentStart?.(this.combiner.getId(), this.combiner.getName());

    const combinerResult = await this.combiner.run(
      `Synthesize these ${workerResults.filter((r) => r.success).length} research perspectives into a comprehensive, well-organized report:\n\n${combinedContext}`,
      `Original task: ${task}`
    );

    callbacks?.onAgentComplete?.(combinerResult);

    if (!combinerResult.success) {
      errors.push(`Combiner failed: ${combinerResult.error}`);
    }

    // Collect all results
    const allResults = [...workerResults, combinerResult];
    const totalDuration = Date.now() - startTime;
    const totalTokens = allResults.reduce((sum, r) => sum + r.tokensUsed, 0);

    const pipelineResult: PipelineResult = {
      output: combinerResult.output || combinedContext,
      agentResults: allResults,
      totalDuration,
      totalTokens,
      success: combinerResult.success,
      errors,
    };

    callbacks?.onPipelineComplete?.(pipelineResult);

    logger.info(
      `[Parallel] Complete in ${totalDuration}ms | ${totalTokens} tokens | ${errors.length} errors`
    );

    return pipelineResult;
  }

  /** Get the number of parallel workers */
  getWorkerCount(): number {
    return this.workers.length;
  }

  /** Get all agent names (workers + combiner) */
  getAgentNames(): string[] {
    return [
      ...this.workers.map((w) => w.getName()),
      `${this.combiner.getName()} (combiner)`,
    ];
  }
}

/**
 * Factory function to create ParallelAgents
 */
export function createParallelAgents(
  workerRoles: AgentRole[],
  combinerRole: AgentRole
): ParallelAgents {
  return new ParallelAgents(workerRoles, combinerRole);
}
