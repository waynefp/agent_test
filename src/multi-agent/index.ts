/**
 * Multi-Agent System - Central Export
 *
 * Phase 15: Multi-Agent Patterns
 *
 * This module provides reusable multi-agent orchestration patterns:
 * - AgentChain: Sequential pipeline (Agent 1 -> Agent 2 -> Agent 3)
 * - ParallelAgents: Fan-out/fan-in (run agents simultaneously, combine results)
 * - SupervisorOrchestrator: Manager/worker (one agent coordinates others)
 * - AgentRouter: Classification-based routing (route to the right specialist)
 */

// Types
export type {
  AgentRole,
  AgentResult,
  AgentMessage,
  PipelineResult,
  PipelineCallbacks,
} from './types.js';

// Worker Agent
export { WorkerAgent, createWorkerAgent } from './WorkerAgent.js';

// Patterns
export {
  AgentChain,
  createAgentChain,
  ParallelAgents,
  createParallelAgents,
  SupervisorOrchestrator,
  createSupervisor,
  AgentRouter,
  createAgentRouter,
} from './patterns/index.js';
