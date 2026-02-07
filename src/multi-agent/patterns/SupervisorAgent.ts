/**
 * Supervisor Agent Pattern (Manager/Worker)
 *
 * One agent coordinates others. Like a project manager delegating tasks.
 *
 * ```
 *                 ┌──────────┐
 *                 │Supervisor│
 *                 └────┬─────┘
 *            ┌─────────┼─────────┐
 *            v         v         v
 *       ┌────────┐ ┌────────┐ ┌────────┐
 *       │Worker 1│ │Worker 2│ │Worker 3│
 *       │Research│ │ Write  │ │ Review │
 *       └────────┘ └────────┘ └────────┘
 * ```
 *
 * BEGINNER NOTE: The supervisor is an AI agent that decides which worker
 * to use next and what instructions to give. It's like having a smart
 * project manager who coordinates specialists.
 *
 * When to use: Complex tasks needing coordination, dynamic task assignment
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
 * A step in the supervisor's plan
 */
interface SupervisorStep {
  /** Which worker to use */
  workerId: string;

  /** Instructions for the worker */
  instructions: string;
}

/**
 * Supervisor Pattern - One agent coordinates workers
 *
 * BEGINNER NOTE: You provide a supervisor agent and a set of worker agents.
 * The supervisor analyzes the task, creates a plan, and delegates to workers.
 */
export class SupervisorOrchestrator {
  private supervisor: WorkerAgent;
  private workers: Map<string, WorkerAgent>;
  private maxIterations: number;

  /**
   * Create a supervisor-based pipeline
   * @param supervisorRole - The supervisor's role definition
   * @param workerRoles - Array of worker role definitions
   * @param maxIterations - Max steps to prevent infinite loops (default: 10)
   */
  constructor(
    supervisorRole: AgentRole,
    workerRoles: AgentRole[],
    maxIterations: number = 10
  ) {
    this.supervisor = new WorkerAgent(supervisorRole);
    this.workers = new Map(
      workerRoles.map((role) => [role.id, new WorkerAgent(role)])
    );
    this.maxIterations = maxIterations;
  }

  /**
   * Run the supervisor pipeline
   *
   * BEGINNER NOTE: The flow is:
   * 1. Supervisor analyzes the task and creates a plan
   * 2. For each step, the appropriate worker executes it
   * 3. Results accumulate as context
   * 4. Supervisor provides a final summary
   *
   * @param task - The task to complete
   * @param callbacks - Optional progress callbacks
   * @returns The pipeline result
   */
  async run(task: string, callbacks?: PipelineCallbacks): Promise<PipelineResult> {
    const startTime = Date.now();
    const agentResults: AgentResult[] = [];
    const errors: string[] = [];

    logger.info(`[Supervisor] Starting with ${this.workers.size} workers`);

    // Step 1: Supervisor creates a plan
    callbacks?.onAgentStart?.(this.supervisor.getId(), this.supervisor.getName());

    const workerList = Array.from(this.workers.entries())
      .map(([id, w]) => `- ${id}: ${w.getRole().systemPrompt.substring(0, 100)}...`)
      .join('\n');

    const planResult = await this.supervisor.run(
      `Analyze this task and create a step-by-step plan. For each step, specify which worker to use and what instructions to give them.

Available workers:
${workerList}

IMPORTANT: Respond in this exact format (one step per line):
STEP: worker_id | instructions for the worker
STEP: worker_id | instructions for the worker
...
DONE

Task: ${task}`
    );

    agentResults.push(planResult);
    callbacks?.onAgentComplete?.(planResult);

    if (!planResult.success) {
      return this.buildResult(
        'Supervisor failed to create a plan',
        agentResults,
        [`Supervisor planning failed: ${planResult.error}`],
        startTime
      );
    }

    // Step 2: Parse the plan
    const steps = this.parsePlan(planResult.output);

    if (steps.length === 0) {
      logger.warn('[Supervisor] No steps found in plan, using fallback approach');
      // Fallback: run all workers in sequence
      const fallbackSteps = Array.from(this.workers.keys()).map((id) => ({
        workerId: id,
        instructions: task,
      }));
      steps.push(...fallbackSteps);
    }

    logger.info(`[Supervisor] Plan has ${steps.length} steps`);

    // Step 3: Execute each step
    let context = '';
    let iterationCount = 0;

    for (const step of steps) {
      if (iterationCount >= this.maxIterations) {
        logger.warn(`[Supervisor] Max iterations (${this.maxIterations}) reached`);
        errors.push('Max iterations reached');
        break;
      }
      iterationCount++;

      const worker = this.workers.get(step.workerId);
      if (!worker) {
        // Try fuzzy match on worker ID
        const fuzzyMatch = this.findClosestWorker(step.workerId);
        if (fuzzyMatch) {
          logger.info(
            `[Supervisor] Fuzzy matched "${step.workerId}" to "${fuzzyMatch.getId()}"`
          );
          callbacks?.onAgentStart?.(fuzzyMatch.getId(), fuzzyMatch.getName());
          const result = await fuzzyMatch.run(step.instructions, context || undefined);
          agentResults.push(result);
          callbacks?.onAgentComplete?.(result);

          if (result.success) {
            context += `\n\n--- ${fuzzyMatch.getName()} ---\n${result.output}`;
          } else {
            errors.push(`${fuzzyMatch.getName()} failed: ${result.error}`);
          }
        } else {
          logger.warn(`[Supervisor] Worker "${step.workerId}" not found, skipping`);
          errors.push(`Worker "${step.workerId}" not found`);
        }
        continue;
      }

      callbacks?.onAgentStart?.(worker.getId(), worker.getName());
      const result = await worker.run(step.instructions, context || undefined);
      agentResults.push(result);
      callbacks?.onAgentComplete?.(result);

      if (result.success) {
        context += `\n\n--- ${worker.getName()} ---\n${result.output}`;
      } else {
        errors.push(`${worker.getName()} failed: ${result.error}`);
      }
    }

    // Step 4: Supervisor provides final summary
    callbacks?.onAgentStart?.(this.supervisor.getId(), `${this.supervisor.getName()} (summary)`);

    const summaryResult = await this.supervisor.run(
      `Based on all the work completed, provide a final comprehensive summary and conclusion.`,
      context
    );

    agentResults.push(summaryResult);
    callbacks?.onAgentComplete?.(summaryResult);

    const finalOutput = summaryResult.success
      ? summaryResult.output
      : `Summary failed. Raw results:\n${context}`;

    return this.buildResult(finalOutput, agentResults, errors, startTime, callbacks);
  }

  /**
   * Parse the supervisor's plan into executable steps
   */
  private parsePlan(planOutput: string): SupervisorStep[] {
    const steps: SupervisorStep[] = [];
    const lines = planOutput.split('\n');

    for (const line of lines) {
      // Match "STEP: worker_id | instructions"
      const match = line.match(/STEP:\s*(\S+)\s*\|\s*(.+)/i);
      if (match) {
        steps.push({
          workerId: match[1].toLowerCase().trim(),
          instructions: match[2].trim(),
        });
      }
    }

    return steps;
  }

  /**
   * Find the closest matching worker by ID (fuzzy match)
   */
  private findClosestWorker(targetId: string): WorkerAgent | null {
    const normalizedTarget = targetId.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const [id, worker] of this.workers) {
      const normalizedId = id.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        normalizedId.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedId)
      ) {
        return worker;
      }
    }

    return null;
  }

  /**
   * Build the final pipeline result
   */
  private buildResult(
    output: string,
    agentResults: AgentResult[],
    errors: string[],
    startTime: number,
    callbacks?: PipelineCallbacks
  ): PipelineResult {
    const totalDuration = Date.now() - startTime;
    const totalTokens = agentResults.reduce((sum, r) => sum + r.tokensUsed, 0);

    const result: PipelineResult = {
      output,
      agentResults,
      totalDuration,
      totalTokens,
      success: errors.length === 0,
      errors,
    };

    callbacks?.onPipelineComplete?.(result);

    logger.info(
      `[Supervisor] Complete in ${totalDuration}ms | ${totalTokens} tokens | ${errors.length} errors`
    );

    return result;
  }

  /** Get worker names */
  getWorkerNames(): string[] {
    return Array.from(this.workers.values()).map((w) => w.getName());
  }
}

/**
 * Factory function
 */
export function createSupervisor(
  supervisorRole: AgentRole,
  workerRoles: AgentRole[],
  maxIterations?: number
): SupervisorOrchestrator {
  return new SupervisorOrchestrator(supervisorRole, workerRoles, maxIterations);
}
