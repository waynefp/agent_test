/**
 * Conversation Type Definitions
 *
 * These types define the structure of messages and conversations.
 * They align with Anthropic's API format while adding helpful metadata.
 *
 * BEGINNER NOTE: A conversation is just a series of messages back and forth
 * between the user and the assistant (Claude).
 */

/**
 * Content block in a message - can be text, image, tool use, or tool result
 * BEGINNER NOTE: Messages can contain different types of content.
 * A message might have text, an image, a tool call, or combinations!
 */
export type MessageContent = TextContent | ImageContent | ToolUseContent | ToolResultContent;

/**
 * Supported image media types
 * BEGINNER NOTE: These are the image formats Claude can understand
 */
export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/**
 * Image content in a message (Phase 12: Vision)
 * BEGINNER NOTE: Claude can "see" images! Send them as base64-encoded data.
 */
export interface ImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: ImageMediaType;
    data: string;  // Base64-encoded image data
  };
}

/**
 * Text content in a message
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Tool use content - represents the agent calling a tool
 * BEGINNER NOTE: When Claude wants to use a tool, it creates one of these
 */
export interface ToolUseContent {
  type: 'tool_use';
  id: string;           // Unique ID for this tool call
  name: string;         // Name of the tool to call
  input: unknown;       // Arguments to pass to the tool
}

/**
 * Tool result content - represents the result of a tool call
 * BEGINNER NOTE: After you execute a tool, you send the result back to Claude
 * using this format
 */
export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;  // ID matching the ToolUseContent
  content: string;      // Result as a string (usually JSON)
  is_error?: boolean;   // Whether this represents an error
}

/**
 * Role of a message participant
 * BEGINNER NOTE: Only two roles exist - user (you) and assistant (Claude)
 */
export type MessageRole = 'user' | 'assistant';

/**
 * A single message in a conversation
 * BEGINNER NOTE: This is the core unit of communication with Claude
 */
export interface Message {
  /** Who sent this message */
  role: MessageRole;

  /** The content of the message (can be multiple parts) */
  content: MessageContent[];

  /** When this message was created */
  timestamp: Date;

  /** Optional unique identifier */
  id?: string;

  /** Optional metadata */
  metadata?: MessageMetadata;
}

/**
 * Metadata about a message
 */
export interface MessageMetadata {
  /** Number of tokens in this message */
  tokens?: number;

  /** Model that generated this message (for assistant messages) */
  model?: string;

  /** Stop reason (why the model stopped generating) */
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';

  /** Any additional metadata */
  [key: string]: unknown;
}

/**
 * A conversation is a collection of messages
 * BEGINNER NOTE: Think of this as the full chat history
 */
export interface Conversation {
  /** Unique identifier for this conversation */
  id: string;

  /** All messages in the conversation */
  messages: Message[];

  /** When the conversation was created */
  createdAt: Date;

  /** When the conversation was last updated */
  updatedAt: Date;

  /** Optional title/name for the conversation */
  title?: string;

  /** Optional metadata */
  metadata?: ConversationMetadata;
}

/**
 * Metadata about a conversation
 */
export interface ConversationMetadata {
  /** Total number of tokens used in this conversation */
  totalTokens?: number;

  /** Number of messages in the conversation */
  messageCount?: number;

  /** Number of tool calls made in this conversation */
  toolCallCount?: number;

  /** Tags for categorizing conversations */
  tags?: string[];

  /** Any additional metadata */
  [key: string]: unknown;
}

/**
 * Options for creating a conversation
 */
export interface ConversationOptions {
  /** Optional ID (will be generated if not provided) */
  id?: string;

  /** Optional title */
  title?: string;

  /** Optional initial metadata */
  metadata?: ConversationMetadata;
}

/**
 * Simplified message format for display
 * BEGINNER NOTE: This is easier to work with than the full Message type
 * when you just want to show text to the user
 */
export interface SimpleMessage {
  role: MessageRole;
  text: string;
  timestamp: Date;
  toolsUsed?: string[];  // Names of tools used in this message
}

/**
 * Helper function to extract text from a message
 * BEGINNER NOTE: Messages can have multiple content blocks,
 * this function gets just the text parts
 */
export function getMessageText(message: Message): string {
  return message.content
    .filter((block): block is TextContent => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

/**
 * Helper function to get tool uses from a message
 * BEGINNER NOTE: Extracts all tool calls from a message
 */
export function getToolUses(message: Message): ToolUseContent[] {
  return message.content.filter(
    (block): block is ToolUseContent => block.type === 'tool_use'
  );
}

/**
 * Helper function to convert Message to SimpleMessage
 * BEGINNER NOTE: Simplifies a message for display purposes
 */
export function toSimpleMessage(message: Message): SimpleMessage {
  const toolsUsed = getToolUses(message).map((tool) => tool.name);

  return {
    role: message.role,
    text: getMessageText(message),
    timestamp: message.timestamp,
    toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
  };
}

/**
 * Type guard to check if content is text
 */
export function isTextContent(content: MessageContent): content is TextContent {
  return content.type === 'text';
}

/**
 * Type guard to check if content is tool use
 */
export function isToolUseContent(
  content: MessageContent
): content is ToolUseContent {
  return content.type === 'tool_use';
}

/**
 * Type guard to check if content is tool result
 */
export function isToolResultContent(
  content: MessageContent
): content is ToolResultContent {
  return content.type === 'tool_result';
}

/**
 * Type guard to check if content is image (Phase 12: Vision)
 */
export function isImageContent(
  content: MessageContent
): content is ImageContent {
  return content.type === 'image';
}

/**
 * Helper to create an ImageContent block from base64 data
 * BEGINNER NOTE: Use this to construct image content for messages
 */
export function createImageContent(
  base64Data: string,
  mediaType: ImageMediaType
): ImageContent {
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType,
      data: base64Data,
    },
  };
}
