/**
 * Multi-Agent System Types
 *
 * Type definitions for the multi-agent orchestration framework.
 *
 * BEGINNER NOTE: These types define how agents communicate and
 * pass information between each other in multi-agent systems.
 *
 * Phase 15: Multi-Agent Patterns
 */

import type { ITool } from '../types/tool.types.js';

/**
 * Configuration for creating a specialized agent
 * BEGINNER NOTE: Each agent in a multi-agent system has its own
 * focused configuration - unlike a single general-purpose agent.
 */
export interface AgentRole {
  /** Unique identifier for this agent role */
  id: string;

  /** Human-readable name */
  name: string;

  /** System prompt that defines this agent's behavior */
  systemPrompt: string;

  /** Optional temperature (0 = precise, 1 = creative) */
  temperature?: number;

  /** Maximum tokens for responses */
  maxTokens?: number;

  /**
   * Optional model to use for this agent
   * BEGINNER NOTE: Defaults to 'sonnet' if not specified.
   * Use 'haiku' for cheaper, mechanical tasks (fact-checking, formatting).
   * Options: 'haiku' | 'sonnet' | 'opus'
   */
  model?: 'haiku' | 'sonnet' | 'opus';

  /**
   * Tools this agent can use (optional)
   * BEGINNER NOTE: Research agents get tools like web search and
   * Google Trends. Analysis agents typically don't need tools -
   * they work with data from other agents.
   */
  tools?: ITool[];
}

/**
 * Result from a single agent's work
 * BEGINNER NOTE: When an agent finishes its task, it returns
 * this structure so other agents can use the output.
 */
export interface AgentResult {
  /** Which agent produced this result */
  agentId: string;

  /** The agent's output text */
  output: string;

  /** Whether the agent completed successfully */
  success: boolean;

  /** Error message if something went wrong */
  error?: string;

  /** How long the agent took (in ms) */
  duration: number;

  /** Token usage for this agent's work */
  tokensUsed: number;
}

/**
 * Message passed between agents
 * BEGINNER NOTE: This is how agents communicate - by passing
 * structured messages to each other.
 */
export interface AgentMessage {
  /** Who sent this message */
  from: string;

  /** Who should receive it */
  to: string;

  /** The type of message */
  type: 'request' | 'response' | 'handoff' | 'context';

  /** The actual content */
  content: string;

  /** Optional structured metadata */
  metadata?: Record<string, unknown>;

  /** When the message was created */
  timestamp: Date;
}

/**
 * Overall result from a multi-agent pipeline
 * BEGINNER NOTE: This is the final output after all agents
 * have finished working together.
 */
export interface PipelineResult {
  /** The final combined output */
  output: string;

  /** Results from each individual agent */
  agentResults: AgentResult[];

  /** Total time for the entire pipeline */
  totalDuration: number;

  /** Total tokens used across all agents */
  totalTokens: number;

  /** Whether the pipeline completed successfully */
  success: boolean;

  /** Any errors that occurred */
  errors: string[];
}

/**
 * Callback for monitoring pipeline progress
 * BEGINNER NOTE: Use this to show progress to the user
 * as the multi-agent pipeline runs.
 */
export interface PipelineCallbacks {
  /** Called when an agent starts working */
  onAgentStart?: (agentId: string, agentName: string) => void;

  /** Called when an agent finishes */
  onAgentComplete?: (result: AgentResult) => void;

  /** Called when an agent produces partial output */
  onAgentProgress?: (agentId: string, text: string) => void;

  /** Called when the pipeline completes */
  onPipelineComplete?: (result: PipelineResult) => void;

  /** Called when an error occurs */
  onError?: (agentId: string, error: string) => void;
}
