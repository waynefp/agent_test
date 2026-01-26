/**
 * Agent Class
 *
 * The core agent that orchestrates conversations with Claude.
 * Now with TOOL SUPPORT! Claude can use tools autonomously.
 *
 * BEGINNER NOTE: The Agent class is like a conductor in an orchestra -
 * it coordinates the ConversationManager (memory), Anthropic client (communication),
 * and now the ToolRegistry and ToolExecutor (tools/abilities).
 */

import type Anthropic from '@anthropic-ai/sdk';
import { ConversationManager, createConversationManager } from './ConversationManager.js';
import {
  getAnthropicClient,
  createMessageParams,
  DEFAULT_AGENT_CONFIG,
} from '../config/anthropic.config.js';
import {
  Persona,
  getPersona,
  buildSystemPrompt,
  DEFAULT_PERSONA,
  getPersonaIds,
} from '../config/personas.js';
import { createToolRegistry, ToolRegistry } from '../tools/ToolRegistry.js';
import { createToolExecutor, ToolExecutor } from '../tools/ToolExecutor.js';
import {
  ContextManager,
  createContextManager,
  type ContextManagerConfig,
  type TokenStats,
  type ContextActionResult,
} from './ContextManager.js';
import {
  ConversationPersistence,
  createConversationPersistence,
  type ConversationMetadata,
  type SaveResult,
  type LoadResult,
} from '../persistence/ConversationPersistence.js';
import type { ITool } from '../types/tool.types.js';
import type { AgentConfig, ChatOptions, AgentState, StreamCallbacks } from '../types/agent.types.js';
import type { Message, ToolUseContent, ImageContent } from '../types/conversation.types.js';
import {
  loadImage,
  toImageContent,
  estimateImageTokens,
} from '../utils/image.js';
import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/errors.js';
import {
  withRetry,
  DEFAULT_RETRY_CONFIG,
} from '../utils/retry.js';

/**
 * Agent class with tool support
 * BEGINNER NOTE: This is the main class you'll interact with to chat with Claude
 */
export class Agent {
  private client: Anthropic;
  private conversationManager: ConversationManager;
  private toolRegistry: ToolRegistry;
  private toolExecutor: ToolExecutor;
  private contextManager: ContextManager;
  private conversationPersistence: ConversationPersistence;
  private config: AgentConfig;
  private state: AgentState;
  private currentPersona: Persona;
  private contextSummary: string | null = null; // Holds summary from trimmed messages

  /**
   * Create a new Agent
   * @param config - Optional configuration (uses defaults if not provided)
   * @param tools - Optional array of tools to register
   */
  constructor(config?: Partial<AgentConfig>, tools?: ITool[]) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.client = getAnthropicClient();
    this.conversationManager = createConversationManager();

    // Initialize tool system
    this.toolRegistry = createToolRegistry();
    this.toolExecutor = createToolExecutor(this.toolRegistry);

    // Initialize context manager (Phase 8)
    this.contextManager = createContextManager();

    // Initialize conversation persistence (Phase 9)
    this.conversationPersistence = createConversationPersistence();

    // Register provided tools
    if (tools && tools.length > 0) {
      this.toolRegistry.registerMany(tools);
      logger.info(`Registered ${tools.length} tool(s)`);
    }

    // Initialize persona (Phase 7)
    // Check if a persona ID was provided in config, otherwise use default
    if (this.config.systemPrompt) {
      // If a custom system prompt was provided, create a custom persona
      this.currentPersona = {
        id: 'custom',
        name: 'Custom',
        description: 'Custom system prompt',
        components: {
          role: 'an AI assistant',
          style: 'helpful',
        },
      };
    } else {
      // Use default persona
      this.currentPersona = DEFAULT_PERSONA;
      // Set the system prompt from the persona
      this.config.systemPrompt = buildSystemPrompt(this.currentPersona.components);
    }

    // Apply recommended temperature from persona if not explicitly set
    if (this.config.temperature === undefined && this.currentPersona.recommendedTemperature) {
      this.config.temperature = this.currentPersona.recommendedTemperature;
    }

    // Initialize state
    this.state = {
      config: this.config,
      currentConversationId: this.conversationManager.getConversationId(),
      messageCount: 0,
      toolCallCount: 0,
      totalTokensUsed: 0,
      createdAt: new Date(),
    };

    logger.agent('Agent initialized', {
      model: this.config.model,
      conversationId: this.state.currentConversationId,
      toolsEnabled: this.config.enableTools && this.toolRegistry.getToolCount() > 0,
      toolCount: this.toolRegistry.getToolCount(),
    });
  }

  /**
   * Register a tool
   * BEGINNER NOTE: Add a new tool that Claude can use
   *
   * @param tool - The tool to register
   */
  registerTool(tool: ITool): void {
    this.toolRegistry.register(tool);
    logger.success(`Tool registered: ${tool.name}`);
  }

  /**
   * Register multiple tools
   *
   * @param tools - Array of tools to register
   */
  registerTools(tools: ITool[]): void {
    this.toolRegistry.registerMany(tools);
    logger.success(`Registered ${tools.length} tool(s)`);
  }

  /**
   * Send a message to Claude and get a response
   * BEGINNER NOTE: This is the main method - it now includes the "agentic loop"
   * where Claude can autonomously decide to use tools!
   *
   * @param userMessage - What the user wants to say
   * @param options - Optional chat options
   * @returns The assistant's response
   */
  async chat(userMessage: string, options?: ChatOptions): Promise<string> {
    try {
      const startTime = Date.now();

      // Add user message to conversation history
      logger.info(`User: ${userMessage}`);
      this.conversationManager.addTextMessage('user', userMessage);

      // Run the agentic loop
      // BEGINNER NOTE: This loop continues until Claude gives a final text response
      const finalResponse = await this.agenticLoop(options);

      // Update state
      const responseTime = Date.now() - startTime;
      this.state.lastActiveAt = new Date();

      logger.success(`Total response time: ${responseTime}ms`);

      return finalResponse;
    } catch (error) {
      logger.error('Failed to get response from Claude', error);
      throw new Error(`Chat failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * The Agentic Loop
   * BEGINNER NOTE: This is the magic! Claude can:
   * 1. Decide to use a tool
   * 2. We execute it
   * 3. Send the result back
   * 4. Claude continues (maybe uses another tool, or gives final answer)
   * 5. Loop until Claude gives a final text response
   *
   * @param options - Chat options
   * @returns The final text response from Claude
   */
  private async agenticLoop(options?: ChatOptions): Promise<string> {
    const maxTurns = options?.maxToolTurns || 10; // Prevent infinite loops
    let turnCount = 0;

    while (turnCount < maxTurns) {
      turnCount++;
      logger.debug(`Agentic loop turn ${turnCount}/${maxTurns}`);

      // Check and apply context management (Phase 8)
      await this.manageContextIfNeeded();

      // Get conversation history
      const messages = this.conversationManager.toAnthropicFormat();

      // Prepare API request
      const params: any = createMessageParams(messages, {
        ...this.config,
        systemPrompt: options?.systemPrompt || this.config.systemPrompt,
      });

      // Add tools if enabled
      if (this.config.enableTools && this.toolRegistry.getToolCount() > 0) {
        params.tools = this.toolRegistry.toAnthropicFormat();
        logger.debug(`Tools available: ${this.toolRegistry.getToolNames().join(', ')}`);
      }

      logger.agent('Sending request to Claude API...');

      // Call Claude with retry logic (Phase 11)
      const retryResult = await withRetry(
        () => this.client.messages.create(params),
        {
          ...DEFAULT_RETRY_CONFIG,
          ...this.config.retryConfig,
          onRetry: (attempt, error, nextDelayMs) => {
            logger.warn(
              `API call failed (attempt ${attempt}), retrying in ${nextDelayMs}ms: ${error.message}`
            );
          },
        }
      );

      if (!retryResult.success || !retryResult.data) {
        const errorMsg = retryResult.error?.message || 'Unknown API error';
        throw new Error(`API call failed after ${retryResult.attempts} attempts: ${errorMsg}`);
      }

      const response = retryResult.data;

      // Update token count
      this.state.totalTokensUsed += response.usage.input_tokens + response.usage.output_tokens;
      logger.info(`Tokens used: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);

      // Add assistant's response to conversation
      this.conversationManager.addAssistantResponse(response);
      this.state.messageCount++;

      // Check the stop reason
      if (response.stop_reason === 'end_turn') {
        // Claude is done - extract and return the text
        const finalText = this.extractTextFromResponse(response);
        logger.success('Claude finished (end_turn)');
        return finalText;
      }

      if (response.stop_reason === 'tool_use') {
        // Claude wants to use tools!
        logger.info('Claude wants to use tools');

        // Extract tool uses from response
        const toolUses = this.extractToolUses(response);

        if (toolUses.length === 0) {
          // No tool uses found (shouldn't happen)
          logger.warn('stop_reason was tool_use but no tools found');
          return this.extractTextFromResponse(response);
        }

        // Execute all tools
        for (const toolUse of toolUses) {
          await this.executeAndAddToolResult(toolUse);
        }

        // Continue the loop - Claude will process the tool results
        continue;
      }

      if (response.stop_reason === 'max_tokens') {
        logger.warn('Response stopped due to max_tokens');
        return this.extractTextFromResponse(response) + '\n[Response truncated due to length]';
      }

      // For any other stop reason, return what we have
      logger.info(`Response stopped: ${response.stop_reason}`);
      return this.extractTextFromResponse(response);
    }

    // Max turns reached
    logger.warn(`Agentic loop reached max turns (${maxTurns})`);
    return 'Sorry, I reached the maximum number of tool uses for this conversation. Please try rephrasing your question.';
  }

  /**
   * Execute a tool and add the result to the conversation
   * BEGINNER NOTE: This runs the tool and sends the result back to Claude
   *
   * @param toolUse - The tool use content block from Claude
   */
  private async executeAndAddToolResult(toolUse: ToolUseContent): Promise<void> {
    try {
      logger.tool(toolUse.name, 'executing', toolUse.input);

      // Execute the tool
      const result = await this.toolExecutor.executeTool(
        toolUse.name,
        toolUse.input
      );

      this.state.toolCallCount++;

      // Format result as string for Claude
      const resultString = JSON.stringify(result.data || result.error, null, 2);

      // Add tool result to conversation
      this.conversationManager.addToolResult(
        toolUse.id,
        resultString,
        !result.success
      );

      if (result.success) {
        logger.success(`Tool ${toolUse.name} executed successfully`);
      } else {
        logger.warn(`Tool ${toolUse.name} failed: ${result.error}`);
      }
    } catch (error) {
      // Tool execution failed
      logger.error(`Tool ${toolUse.name} execution error:`, error);

      // Send error back to Claude
      this.conversationManager.addToolResult(
        toolUse.id,
        `Error executing tool: ${getErrorMessage(error)}`,
        true
      );
    }
  }

  /**
   * Extract text from Anthropic's response
   * BEGINNER NOTE: Gets just the text parts from Claude's response
   *
   * @param response - Response from Anthropic API
   * @returns The text content
   */
  private extractTextFromResponse(response: Anthropic.Message): string {
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    if (textBlocks.length === 0) {
      return '';
    }

    return textBlocks.map((block) => block.text).join('\n\n');
  }

  /**
   * Extract tool uses from Anthropic's response
   * BEGINNER NOTE: Finds all the tools Claude wants to use
   *
   * @param response - Response from Anthropic API
   * @returns Array of tool use content blocks
   */
  private extractToolUses(response: Anthropic.Message): ToolUseContent[] {
    const toolUses: ToolUseContent[] = [];

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

  /**
   * Get the conversation history
   */
  getConversationHistory(): Message[] {
    return this.conversationManager.getMessages();
  }

  /**
   * Get a summary of the conversation
   */
  getConversationSummary(): string {
    return this.conversationManager.getSummary();
  }

  /**
   * Clear the conversation history
   */
  clearConversation(): void {
    this.conversationManager.clearMessages();
    logger.info('Conversation cleared');
  }

  /**
   * Get the agent's current state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get the agent's configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update the agent's configuration
   *
   * @param config - New configuration values
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
    this.state.config = this.config;
    logger.info('Agent configuration updated', config);
  }

  /**
   * Get statistics about token usage
   */
  getTokenUsage(): {
    total: number;
    perMessage: number;
  } {
    return {
      total: this.state.totalTokensUsed,
      perMessage: this.state.messageCount > 0
        ? Math.round(this.state.totalTokensUsed / this.state.messageCount)
        : 0,
    };
  }

  /**
   * Get a simple text representation of the conversation
   */
  getConversationText(): string {
    const messages = this.conversationManager.getMessages();
    return messages
      .map((msg) => {
        const text = msg.content
          .filter((block) => block.type === 'text')
          .map((block) => (block as any).text)
          .join('\n');

        const role = msg.role === 'user' ? 'You' : 'Assistant';
        return text ? `${role}: ${text}` : '';
      })
      .filter(line => line.length > 0)
      .join('\n\n');
  }

  /**
   * Send a message and stream the response
   * BEGINNER NOTE: This method shows the response as it's being generated,
   * character by character, for a more interactive experience.
   *
   * @param userMessage - What the user wants to say
   * @param callbacks - Functions to call as the response streams in
   * @param options - Optional chat options
   * @returns The complete response text
   */
  async chatStream(
    userMessage: string,
    callbacks: StreamCallbacks,
    options?: ChatOptions
  ): Promise<string> {
    try {
      const startTime = Date.now();

      // Add user message to conversation history
      logger.info(`User: ${userMessage}`);
      this.conversationManager.addTextMessage('user', userMessage);

      // Run the streaming agentic loop
      const finalResponse = await this.agenticLoopStreaming(callbacks, options);

      // Update state
      const responseTime = Date.now() - startTime;
      this.state.lastActiveAt = new Date();

      logger.success(`Total response time: ${responseTime}ms`);

      // Call onComplete callback
      callbacks.onComplete?.(finalResponse);

      return finalResponse;
    } catch (error) {
      logger.error('Failed to get streaming response from Claude', error);
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks.onError?.(err);
      throw new Error(`Chat failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * The Streaming Agentic Loop
   * BEGINNER NOTE: Same as the regular agentic loop, but streams the text response
   * in real-time as Claude generates it.
   *
   * @param callbacks - Streaming callbacks
   * @param options - Chat options
   * @returns The final text response from Claude
   */
  private async agenticLoopStreaming(
    callbacks: StreamCallbacks,
    options?: ChatOptions
  ): Promise<string> {
    const maxTurns = options?.maxToolTurns || 10;
    let turnCount = 0;
    let fullText = '';

    while (turnCount < maxTurns) {
      turnCount++;
      logger.debug(`Streaming agentic loop turn ${turnCount}/${maxTurns}`);

      // Check and apply context management (Phase 8)
      await this.manageContextIfNeeded();

      // Get conversation history
      const messages = this.conversationManager.toAnthropicFormat();

      // Prepare API request
      const params: any = {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        messages,
      };

      // Add system prompt
      const systemPrompt = options?.systemPrompt || this.config.systemPrompt;
      if (systemPrompt) {
        params.system = systemPrompt;
      }

      // Add tools if enabled
      if (this.config.enableTools && this.toolRegistry.getToolCount() > 0) {
        params.tools = this.toolRegistry.toAnthropicFormat();
        logger.debug(`Tools available: ${this.toolRegistry.getToolNames().join(', ')}`);
      }

      logger.agent('Starting streaming request to Claude API...');

      // Create streaming request with retry logic (Phase 11)
      // Note: For streaming, we retry the initial connection, not the entire stream
      const retryResult = await withRetry(
        async () => this.client.messages.stream(params),
        {
          ...DEFAULT_RETRY_CONFIG,
          ...this.config.retryConfig,
          onRetry: (attempt, error, nextDelayMs) => {
            logger.warn(
              `Streaming API call failed (attempt ${attempt}), retrying in ${nextDelayMs}ms: ${error.message}`
            );
          },
        }
      );

      if (!retryResult.success || !retryResult.data) {
        const errorMsg = retryResult.error?.message || 'Unknown API error';
        throw new Error(`Streaming API call failed after ${retryResult.attempts} attempts: ${errorMsg}`);
      }

      const stream = retryResult.data;

      // Collect the response
      let currentText = '';
      const toolUseBlocks: ToolUseContent[] = [];
      // Note: stopReason is tracked via finalMessage.stop_reason

      // Process the stream
      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            // Tool use starting
            callbacks.onToolUse?.(event.content_block.name, event.content_block.id);
            toolUseBlocks.push({
              type: 'tool_use',
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
            });
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            // Text chunk received
            const text = event.delta.text;
            currentText += text;
            fullText += text;
            callbacks.onText?.(text);
          } else if (event.delta.type === 'input_json_delta') {
            // Tool input being streamed
            // We'll collect the full input from the final message
          }
        }
        // Note: message_delta events contain stop_reason but we get it from finalMessage
      }

      // Get the final message for complete data
      const finalMessage = await stream.finalMessage();

      // Update token count
      this.state.totalTokensUsed += finalMessage.usage.input_tokens + finalMessage.usage.output_tokens;
      callbacks.onUsage?.(finalMessage.usage.input_tokens, finalMessage.usage.output_tokens);
      logger.info(`Tokens used: ${finalMessage.usage.input_tokens} in, ${finalMessage.usage.output_tokens} out`);

      // Add assistant's response to conversation
      this.conversationManager.addAssistantResponse(finalMessage);
      this.state.messageCount++;

      // Check the stop reason
      if (finalMessage.stop_reason === 'end_turn') {
        logger.success('Claude finished (end_turn)');
        return fullText;
      }

      if (finalMessage.stop_reason === 'tool_use') {
        // Claude wants to use tools!
        logger.info('Claude wants to use tools');

        // Extract tool uses from the final message (for complete input data)
        const toolUses = this.extractToolUses(finalMessage);

        if (toolUses.length === 0) {
          logger.warn('stop_reason was tool_use but no tools found');
          return fullText;
        }

        // Execute all tools
        for (const toolUse of toolUses) {
          callbacks.onToolUse?.(toolUse.name, toolUse.id);
          await this.executeAndAddToolResult(toolUse);
          callbacks.onToolResult?.(toolUse.name, true);
        }

        // Reset text for next turn (tool results don't contribute to final text)
        // Continue the loop - Claude will process the tool results
        continue;
      }

      if (finalMessage.stop_reason === 'max_tokens') {
        logger.warn('Response stopped due to max_tokens');
        return fullText + '\n[Response truncated due to length]';
      }

      // For any other stop reason, return what we have
      logger.info(`Response stopped: ${finalMessage.stop_reason}`);
      return fullText;
    }

    // Max turns reached
    logger.warn(`Agentic loop reached max turns (${maxTurns})`);
    return fullText || 'Sorry, I reached the maximum number of tool uses for this conversation.';
  }

  /**
   * Get list of available tools
   */
  getAvailableTools(): string[] {
    return this.toolRegistry.getToolNames();
  }

  /**
   * Get tool statistics
   */
  getToolStats(): {
    available: number;
    used: number;
  } {
    return {
      available: this.toolRegistry.getToolCount(),
      used: this.state.toolCallCount,
    };
  }

  // ============================================
  // Vision Methods (Phase 12)
  // ============================================

  /**
   * Send a message with an image to Claude
   * BEGINNER NOTE: Claude can "see" images! Use this to ask questions about images.
   *
   * @param imagePath - Path to image file or URL
   * @param question - What to ask about the image (optional)
   * @param options - Optional chat options
   * @returns Claude's response about the image
   *
   * @example
   * ```typescript
   * const response = await agent.chatWithImage(
   *   './screenshot.png',
   *   'What is shown in this image?'
   * );
   * ```
   */
  async chatWithImage(
    imagePath: string,
    question?: string,
    options?: ChatOptions
  ): Promise<string> {
    try {
      const startTime = Date.now();

      // Load the image
      logger.info(`Loading image: ${imagePath}`);
      const image = await loadImage(imagePath);
      const imageContent = toImageContent(image);

      // Log estimated token cost
      const estimatedTokens = estimateImageTokens(image);
      logger.info(`Image loaded (estimated ${estimatedTokens} tokens)`);

      // Add the image message to conversation
      const prompt = question || 'Please describe this image.';
      this.conversationManager.addImageMessage(imageContent, prompt);

      // Run the agentic loop (same as regular chat)
      const finalResponse = await this.agenticLoop(options);

      // Update state
      const responseTime = Date.now() - startTime;
      this.state.lastActiveAt = new Date();

      logger.success(`Image chat response time: ${responseTime}ms`);

      return finalResponse;
    } catch (error) {
      logger.error('Failed to process image', error);
      throw new Error(`Image chat failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Send a message with multiple images to Claude
   * BEGINNER NOTE: You can send multiple images in one message for comparison!
   *
   * @param imagePaths - Array of image file paths or URLs
   * @param question - What to ask about the images
   * @param options - Optional chat options
   * @returns Claude's response about the images
   *
   * @example
   * ```typescript
   * const response = await agent.chatWithImages(
   *   ['./before.png', './after.png'],
   *   'What are the differences between these two images?'
   * );
   * ```
   */
  async chatWithImages(
    imagePaths: string[],
    question?: string,
    options?: ChatOptions
  ): Promise<string> {
    try {
      const startTime = Date.now();

      // Load all images
      logger.info(`Loading ${imagePaths.length} images...`);
      const images: ImageContent[] = [];
      let totalEstimatedTokens = 0;

      for (const imagePath of imagePaths) {
        const image = await loadImage(imagePath);
        images.push(toImageContent(image));
        totalEstimatedTokens += estimateImageTokens(image);
      }

      logger.info(`All images loaded (estimated ${totalEstimatedTokens} tokens total)`);

      // Add the multi-image message to conversation
      const prompt = question || 'Please describe these images.';
      this.conversationManager.addMultiImageMessage(images, prompt);

      // Run the agentic loop
      const finalResponse = await this.agenticLoop(options);

      // Update state
      const responseTime = Date.now() - startTime;
      this.state.lastActiveAt = new Date();

      logger.success(`Multi-image chat response time: ${responseTime}ms`);

      return finalResponse;
    } catch (error) {
      logger.error('Failed to process images', error);
      throw new Error(`Multi-image chat failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Send a message with an image using streaming response
   * BEGINNER NOTE: Same as chatWithImage but streams the response
   *
   * @param imagePath - Path to image file or URL
   * @param question - What to ask about the image
   * @param callbacks - Streaming callbacks
   * @param options - Optional chat options
   * @returns The complete response text
   */
  async chatWithImageStream(
    imagePath: string,
    question: string | undefined,
    callbacks: StreamCallbacks,
    options?: ChatOptions
  ): Promise<string> {
    try {
      const startTime = Date.now();

      // Load the image
      logger.info(`Loading image: ${imagePath}`);
      const image = await loadImage(imagePath);
      const imageContent = toImageContent(image);

      // Log estimated token cost
      const estimatedTokens = estimateImageTokens(image);
      logger.info(`Image loaded (estimated ${estimatedTokens} tokens)`);

      // Add the image message to conversation
      const prompt = question || 'Please describe this image.';
      this.conversationManager.addImageMessage(imageContent, prompt);

      // Run the streaming agentic loop
      const finalResponse = await this.agenticLoopStreaming(callbacks, options);

      // Update state
      const responseTime = Date.now() - startTime;
      this.state.lastActiveAt = new Date();

      logger.success(`Image chat response time: ${responseTime}ms`);

      // Call onComplete callback
      callbacks.onComplete?.(finalResponse);

      return finalResponse;
    } catch (error) {
      logger.error('Failed to process image', error);
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks.onError?.(err);
      throw new Error(`Image chat failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Load an image for inspection (without sending to Claude)
   * BEGINNER NOTE: Use this to check image details before sending
   *
   * @param imagePath - Path to image file or URL
   * @returns Image details including estimated token cost
   */
  async inspectImage(imagePath: string): Promise<{
    source: string;
    mediaType: string;
    sizeBytes: number;
    estimatedTokens: number;
  }> {
    const image = await loadImage(imagePath);
    return {
      source: image.source,
      mediaType: image.mediaType,
      sizeBytes: image.sizeBytes,
      estimatedTokens: estimateImageTokens(image),
    };
  }

  // ============================================
  // Context Management Methods (Phase 8)
  // ============================================

  /**
   * Check and apply context management if needed
   * BEGINNER NOTE: This runs before each API call to ensure we don't
   * exceed the context window limit.
   */
  private async manageContextIfNeeded(): Promise<ContextActionResult | null> {
    const messages = this.conversationManager.getMessages();
    const stats = this.contextManager.getStats(messages);

    // Log warning if approaching limit
    if (stats.isWarning && !stats.needsAction) {
      logger.warn(`Context usage: ${Math.round(stats.percentUsed * 100)}% - approaching limit`);
    }

    // Apply strategy if action is needed
    if (stats.needsAction) {
      logger.info('Context limit reached, applying management strategy...');

      const { messages: trimmedMessages, result, summary } = this.contextManager.applyStrategy(messages);

      // Update conversation with trimmed messages
      this.conversationManager.setMessages(trimmedMessages);

      // Store summary if one was generated
      if (summary) {
        this.contextSummary = summary;
        logger.info(`Context summary: ${summary}`);
      }

      logger.success(`Context managed: ${result.messagesRemoved} messages removed, ~${result.tokensFreed} tokens freed`);
      return result;
    }

    return null;
  }

  /**
   * Get current context statistics
   * BEGINNER NOTE: Shows how much of the context window is being used
   */
  getContextStats(): TokenStats {
    const messages = this.conversationManager.getMessages();
    return this.contextManager.getStats(messages);
  }

  /**
   * Get human-readable context status
   */
  getContextStatus(): string {
    const messages = this.conversationManager.getMessages();
    return this.contextManager.getStatusString(messages);
  }

  /**
   * Configure context management
   * BEGINNER NOTE: Change how context is managed (strategy, thresholds, etc.)
   *
   * @param config - New context configuration
   */
  configureContext(config: Partial<ContextManagerConfig>): void {
    this.contextManager.updateConfig(config);
  }

  /**
   * Get context configuration
   */
  getContextConfig(): ContextManagerConfig {
    return this.contextManager.getConfig();
  }

  /**
   * Get the context summary (if messages were trimmed)
   * BEGINNER NOTE: When old messages are removed, a summary is saved here
   */
  getContextSummary(): string | null {
    return this.contextSummary;
  }

  /**
   * Manually trigger context management
   * BEGINNER NOTE: Force context trimming even if not at the threshold
   */
  async trimContext(): Promise<ContextActionResult> {
    const messages = this.conversationManager.getMessages();
    const { messages: trimmedMessages, result, summary } = this.contextManager.applyStrategy(messages);

    this.conversationManager.setMessages(trimmedMessages);

    if (summary) {
      this.contextSummary = summary;
    }

    return result;
  }

  // ============================================
  // Persona Methods (Phase 7)
  // ============================================

  /**
   * Get the current persona
   */
  getPersona(): Persona {
    return this.currentPersona;
  }

  /**
   * Set the agent's persona by ID
   * BEGINNER NOTE: This changes the agent's "personality" and behavior
   *
   * @param personaId - The ID of the persona to use
   * @returns true if persona was found and set, false otherwise
   */
  setPersona(personaId: string): boolean {
    const persona = getPersona(personaId);
    if (!persona) {
      logger.warn(`Persona not found: ${personaId}`);
      return false;
    }

    this.currentPersona = persona;
    this.config.systemPrompt = buildSystemPrompt(persona.components);

    // Optionally apply recommended temperature
    if (persona.recommendedTemperature !== undefined) {
      this.config.temperature = persona.recommendedTemperature;
    }

    logger.success(`Persona changed to: ${persona.name}`);
    return true;
  }

  /**
   * Set a custom system prompt
   * BEGINNER NOTE: For advanced users who want full control over the prompt
   *
   * @param prompt - The system prompt to use
   */
  setSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt;
    this.currentPersona = {
      id: 'custom',
      name: 'Custom',
      description: 'Custom system prompt',
      components: {
        role: 'an AI assistant',
        style: 'as specified',
      },
    };
    logger.info('System prompt updated');
  }

  /**
   * Get list of available persona IDs
   */
  getAvailablePersonas(): string[] {
    return getPersonaIds();
  }

  /**
   * Get the current system prompt
   */
  getSystemPrompt(): string {
    return this.config.systemPrompt || '';
  }

  // ============================================
  // Persistence Methods (Phase 9)
  // ============================================

  /**
   * Save the current conversation to disk
   * BEGINNER NOTE: This preserves your conversation so you can resume it later
   *
   * @param title - Optional title for the conversation
   * @returns Result of the save operation
   */
  async saveConversation(title?: string): Promise<SaveResult> {
    const conversation = this.conversationManager.getConversation();
    return this.conversationPersistence.save(conversation, {
      title,
      overwrite: true,
    });
  }

  /**
   * Load a conversation from disk
   * BEGINNER NOTE: This restores a previously saved conversation
   *
   * @param conversationId - The ID of the conversation to load
   * @returns Result of the load operation
   */
  async loadConversation(conversationId: string): Promise<LoadResult> {
    const result = await this.conversationPersistence.load(conversationId);

    if (result.success && result.conversation) {
      // Replace current conversation with loaded one
      this.conversationManager = createConversationManager({
        id: result.conversation.id,
        title: result.conversation.title,
        metadata: result.conversation.metadata,
      });

      // Restore messages
      this.conversationManager.setMessages(result.conversation.messages);

      // Update state
      this.state.currentConversationId = result.conversation.id;
      this.state.messageCount = result.conversation.messages.length;

      // Clear context summary since we're loading a new conversation
      this.contextSummary = null;

      logger.success(`Loaded conversation: ${result.conversation.title || conversationId}`);
    }

    return result;
  }

  /**
   * List all saved conversations
   *
   * @returns Array of conversation metadata
   */
  async listSavedConversations(): Promise<ConversationMetadata[]> {
    return this.conversationPersistence.list();
  }

  /**
   * Delete a saved conversation
   *
   * @param conversationId - The ID of the conversation to delete
   * @returns true if deleted, false if not found
   */
  async deleteSavedConversation(conversationId: string): Promise<boolean> {
    return this.conversationPersistence.delete(conversationId);
  }

  /**
   * Check if a conversation exists
   *
   * @param conversationId - The ID to check
   * @returns true if exists
   */
  async conversationExists(conversationId: string): Promise<boolean> {
    return this.conversationPersistence.exists(conversationId);
  }

  /**
   * Get the current conversation ID
   */
  getConversationId(): string {
    return this.state.currentConversationId || '';
  }

  /**
   * Get the current conversation title
   */
  getConversationTitle(): string {
    return this.conversationManager.getConversation().title || 'Untitled';
  }

  /**
   * Set the conversation title
   */
  setConversationTitle(title: string): void {
    this.conversationManager.setTitle(title);
  }
}

/**
 * Factory function to create a new Agent
 * BEGINNER NOTE: Use this to create your agent with tools!
 *
 * @param config - Optional configuration
 * @param tools - Optional array of tools
 * @returns A new Agent instance
 */
export function createAgent(config?: Partial<AgentConfig>, tools?: ITool[]): Agent {
  return new Agent(config, tools);
}
