/**
 * Agent Type Definitions
 *
 * These types define the configuration and response formats for the agent.
 *
 * BEGINNER NOTE: The agent is the "brain" that orchestrates everything -
 * it manages conversations, calls tools, and tracks tasks.
 */

import type { ToolUse } from './tool.types.js';
import type { Task } from './task.types.js';
import type { Message } from './conversation.types.js';

/**
 * Configuration for creating an agent
 * BEGINNER NOTE: These settings control how the agent behaves
 */
export interface AgentConfig {
  /** The Claude model to use */
  model: string;

  /** Maximum tokens in the response */
  maxTokens: number;

  /** System prompt (instructions for the agent) */
  systemPrompt?: string;

  /** Temperature (0-1, controls randomness) */
  temperature?: number;

  /** Whether to enable tool use */
  enableTools?: boolean;

  /** Whether to enable task tracking */
  enableTaskTracking?: boolean;
}

/**
 * Response from the agent after processing a message
 * BEGINNER NOTE: This is what you get back when you send a message to the agent
 */
export interface AgentResponse {
  /** The text message from the agent */
  message: string;

  /** Tools that were used to generate this response */
  toolsUsed: ToolUse[];

  /** Tasks created or updated during this interaction */
  tasks: Task[];

  /** Optional metadata about the response */
  metadata?: AgentResponseMetadata;
}

/**
 * Metadata about an agent response
 */
export interface AgentResponseMetadata {
  /** Number of tokens used */
  tokensUsed?: number;

  /** Model that generated the response */
  model?: string;

  /** How long the response took to generate (in milliseconds) */
  responseTime?: number;

  /** Stop reason */
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';

  /** Number of tool calls made */
  toolCallCount?: number;

  /** Any additional metadata */
  [key: string]: unknown;
}

/**
 * Options for sending a message to the agent
 */
export interface ChatOptions {
  /** Whether to include conversation history */
  includeHistory?: boolean;

  /** Maximum number of turns in the tool-calling loop */
  maxToolTurns?: number;

  /** Custom system prompt for this message */
  systemPrompt?: string;

  /** Whether to track this as a task */
  trackAsTask?: boolean;

  /** Task description (if trackAsTask is true) */
  taskDescription?: string;
}

/**
 * State of the agent
 * BEGINNER NOTE: This represents everything the agent knows and is working on
 */
export interface AgentState {
  /** Current configuration */
  config: AgentConfig;

  /** Current conversation ID (if in a conversation) */
  currentConversationId?: string;

  /** Current task ID (if working on a task) */
  currentTaskId?: string;

  /** Number of messages processed */
  messageCount: number;

  /** Number of tool calls made */
  toolCallCount: number;

  /** Total tokens used */
  totalTokensUsed: number;

  /** When the agent was created */
  createdAt: Date;

  /** When the agent last processed a message */
  lastActiveAt?: Date;
}

/**
 * Event emitted by the agent
 * BEGINNER NOTE: Events let you react to things happening in the agent
 * (like when a tool is called, or a message is sent)
 */
export type AgentEvent =
  | MessageSentEvent
  | MessageReceivedEvent
  | ToolCalledEvent
  | ToolCompletedEvent
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | ErrorEvent;

/**
 * Event emitted when a message is sent to Claude
 */
export interface MessageSentEvent {
  type: 'message_sent';
  message: Message;
  timestamp: Date;
}

/**
 * Event emitted when a response is received from Claude
 */
export interface MessageReceivedEvent {
  type: 'message_received';
  message: Message;
  timestamp: Date;
}

/**
 * Event emitted when a tool is called
 */
export interface ToolCalledEvent {
  type: 'tool_called';
  toolName: string;
  toolId: string;
  input: unknown;
  timestamp: Date;
}

/**
 * Event emitted when a tool completes
 */
export interface ToolCompletedEvent {
  type: 'tool_completed';
  toolName: string;
  toolId: string;
  success: boolean;
  result: unknown;
  executionTime: number;
  timestamp: Date;
}

/**
 * Event emitted when a task is created
 */
export interface TaskCreatedEvent {
  type: 'task_created';
  task: Task;
  timestamp: Date;
}

/**
 * Event emitted when a task is updated
 */
export interface TaskUpdatedEvent {
  type: 'task_updated';
  task: Task;
  previousStatus: string;
  timestamp: Date;
}

/**
 * Event emitted when an error occurs
 */
export interface ErrorEvent {
  type: 'error';
  error: Error;
  context?: string;
  timestamp: Date;
}

/**
 * Callback function type for event listeners
 */
export type AgentEventListener = (event: AgentEvent) => void;

/**
 * Callbacks for streaming responses
 * BEGINNER NOTE: These functions are called as the response streams in
 */
export interface StreamCallbacks {
  /** Called when a new text chunk arrives */
  onText?: (text: string) => void;

  /** Called when a tool is being used */
  onToolUse?: (toolName: string, toolId: string) => void;

  /** Called when a tool result is received */
  onToolResult?: (toolName: string, success: boolean) => void;

  /** Called when the response is complete */
  onComplete?: (fullText: string) => void;

  /** Called when an error occurs */
  onError?: (error: Error) => void;

  /** Called with token usage info at the end */
  onUsage?: (inputTokens: number, outputTokens: number) => void;
}

/**
 * Error thrown when agent operations fail
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

/**
 * Error thrown when agent configuration is invalid
 */
export class AgentConfigurationError extends AgentError {
  constructor(message: string) {
    super(message);
    this.name = 'AgentConfigurationError';
  }
}
