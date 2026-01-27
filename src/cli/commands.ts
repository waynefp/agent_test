/**
 * CLI Commands
 *
 * Handles command execution and the interactive chat loop.
 *
 * BEGINNER NOTE: This file contains the logic for the interactive chat session.
 * It's the "game loop" that keeps asking for input and showing responses.
 */

import { Agent } from '../agent/Agent.js';
import { TaskTracker } from '../agent/TaskTracker.js';
import { getUserMessage, confirmAction } from './prompts.js';
import {
  displayWelcome,
  displayHelp,
  displayUserMessage,
  displaySystemMessage,
  displayError,
  displaySuccess,
  displayHistory,
  displayStats,
  displaySeparator,
  clearScreen,
  displayTasks,
  displayTaskDetail,
  displayTaskStats,
  displayTaskHelp,
  startStreamingResponse,
  writeStreamChunk,
  endStreamingResponse,
  displayToolUseNotification,
  displayStreamError,
  displayPersonas,
  displayPersonaDetail,
  displayPersonaHelp,
} from './display.js';
import type { StreamCallbacks } from '../types/agent.types.js';
import { getAllPersonas, getPersona } from '../config/personas.js';
import { logger } from '../utils/logger.js';
import {
  getSupportedExtensions,
  formatFileSize,
} from '../utils/image.js';

/**
 * Check if a message is a command
 * BEGINNER NOTE: Commands start with '/' like /help or /exit
 */
function isCommand(message: string): boolean {
  return message.startsWith('/');
}

/**
 * Handle a command
 * BEGINNER NOTE: Execute special commands like /help, /clear, etc.
 *
 * @param command - The command to execute
 * @param agent - The agent instance
 * @param taskTracker - Optional task tracker instance
 * @returns true if should continue chat loop, false if should exit
 */
async function handleCommand(
  command: string,
  agent: Agent,
  taskTracker?: TaskTracker
): Promise<boolean> {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case '/help':
      displayHelp();
      if (taskTracker) {
        displayTaskHelp();
      }
      return true;

    case '/exit':
    case '/quit':
      displaySystemMessage('Goodbye! Thanks for chatting.');
      return false;

    case '/clear':
      const confirmed = await confirmAction(
        'Are you sure you want to clear the conversation history?'
      );
      if (confirmed) {
        agent.clearConversation();
        clearScreen();
        displaySuccess('Conversation cleared!');
      }
      return true;

    case '/history':
      const conversationText = agent.getConversationText();
      if (conversationText.trim().length === 0) {
        displaySystemMessage('No conversation history yet. Start chatting!');
      } else {
        displayHistory(conversationText);
      }
      return true;

    case '/stats':
      const state = agent.getState();
      const tokenUsage = agent.getTokenUsage();
      displayStats({
        messageCount: state.messageCount,
        totalTokens: tokenUsage.total,
        avgTokensPerMessage: tokenUsage.perMessage,
        conversationId: state.currentConversationId || 'N/A',
      });
      return true;

    // ============================================
    // Task Commands (Phase 5)
    // ============================================

    case '/tasks':
      if (!taskTracker) {
        displayError('Task tracking is not enabled');
        return true;
      }
      displayTasks(taskTracker.getAllTasks());
      return true;

    case '/task':
      if (!taskTracker) {
        displayError('Task tracking is not enabled');
        return true;
      }
      return await handleTaskCommand(args, taskTracker);

    // ============================================
    // Persona Commands (Phase 7)
    // ============================================

    case '/personas':
      displayPersonas(getAllPersonas(), agent.getPersona().id);
      return true;

    case '/persona':
      return handlePersonaCommand(args, agent);

    // ============================================
    // Context Commands (Phase 8)
    // ============================================

    case '/context':
      return handleContextCommand(args, agent);

    // ============================================
    // Session Commands (Phase 9)
    // ============================================

    case '/save':
      return await handleSaveCommand(args, agent);

    case '/load':
      return await handleLoadCommand(args, agent);

    case '/sessions':
      return await handleSessionsCommand(agent);

    case '/session':
      return await handleSessionCommand(args, agent);

    // ============================================
    // Image Commands (Phase 12)
    // ============================================

    case '/image':
      return await handleImageCommand(args, agent, command);

    default:
      displayError(`Unknown command: ${cmd}`);
      displaySystemMessage('Type /help to see available commands');
      return true;
  }
}

/**
 * Handle task subcommands
 * BEGINNER NOTE: This handles commands like /task add, /task done, etc.
 *
 * @param args - Command arguments
 * @param taskTracker - Task tracker instance
 * @returns true to continue chat loop
 */
async function handleTaskCommand(
  args: string[],
  taskTracker: TaskTracker
): Promise<boolean> {
  if (args.length === 0) {
    displayTaskHelp();
    return true;
  }

  const subCommand = args[0].toLowerCase();
  const subArgs = args.slice(1);

  switch (subCommand) {
    case 'add':
    case 'create':
      if (subArgs.length === 0) {
        displayError('Please provide a task description');
        displaySystemMessage('Usage: /task add <description>');
        return true;
      }
      const description = subArgs.join(' ');
      const newTask = await taskTracker.createTask({ description });
      displaySuccess(`Task created: ${newTask.id.substring(0, 8)}`);
      displayTaskDetail(newTask);
      return true;

    case 'show':
    case 'view':
      if (subArgs.length === 0) {
        displayError('Please provide a task ID');
        displaySystemMessage('Usage: /task show <id>');
        return true;
      }
      const showTask = findTaskByPartialId(taskTracker, subArgs[0]);
      if (!showTask) {
        displayError(`Task not found: ${subArgs[0]}`);
        return true;
      }
      displayTaskDetail(showTask);
      return true;

    case 'start':
      if (subArgs.length === 0) {
        displayError('Please provide a task ID');
        displaySystemMessage('Usage: /task start <id>');
        return true;
      }
      const startTask = findTaskByPartialId(taskTracker, subArgs[0]);
      if (!startTask) {
        displayError(`Task not found: ${subArgs[0]}`);
        return true;
      }
      await taskTracker.startTask(startTask.id);
      displaySuccess(`Task started: ${startTask.description}`);
      return true;

    case 'done':
    case 'complete':
      if (subArgs.length === 0) {
        displayError('Please provide a task ID');
        displaySystemMessage('Usage: /task done <id>');
        return true;
      }
      const doneTask = findTaskByPartialId(taskTracker, subArgs[0]);
      if (!doneTask) {
        displayError(`Task not found: ${subArgs[0]}`);
        return true;
      }
      await taskTracker.completeTask(doneTask.id);
      displaySuccess(`Task completed: ${doneTask.description}`);
      return true;

    case 'fail':
      if (subArgs.length === 0) {
        displayError('Please provide a task ID');
        displaySystemMessage('Usage: /task fail <id>');
        return true;
      }
      const failTask = findTaskByPartialId(taskTracker, subArgs[0]);
      if (!failTask) {
        displayError(`Task not found: ${subArgs[0]}`);
        return true;
      }
      const errorMsg = subArgs.slice(1).join(' ') || undefined;
      await taskTracker.failTask(failTask.id, errorMsg);
      displaySuccess(`Task marked as failed: ${failTask.description}`);
      return true;

    case 'delete':
    case 'remove':
      if (subArgs.length === 0) {
        displayError('Please provide a task ID');
        displaySystemMessage('Usage: /task delete <id>');
        return true;
      }
      const deleteTask = findTaskByPartialId(taskTracker, subArgs[0]);
      if (!deleteTask) {
        displayError(`Task not found: ${subArgs[0]}`);
        return true;
      }
      const confirmDelete = await confirmAction(
        `Delete task "${deleteTask.description}"?`
      );
      if (confirmDelete) {
        await taskTracker.deleteTask(deleteTask.id);
        displaySuccess('Task deleted');
      }
      return true;

    case 'stats':
      displayTaskStats(taskTracker.getStatistics());
      return true;

    case 'clear':
      const confirmClear = await confirmAction(
        'Are you sure you want to delete ALL tasks?'
      );
      if (confirmClear) {
        await taskTracker.clearAllTasks();
        displaySuccess('All tasks cleared');
      }
      return true;

    default:
      displayError(`Unknown task command: ${subCommand}`);
      displayTaskHelp();
      return true;
  }
}

/**
 * Find a task by partial ID match
 * BEGINNER NOTE: This lets users type just the first few characters of an ID
 *
 * @param taskTracker - Task tracker instance
 * @param partialId - Partial task ID (at least 4 characters)
 * @returns The matching task, or undefined if not found
 */
function findTaskByPartialId(
  taskTracker: TaskTracker,
  partialId: string
): ReturnType<TaskTracker['getTask']> {
  // Try exact match first
  const exactMatch = taskTracker.getTask(partialId);
  if (exactMatch) {
    return exactMatch;
  }

  // Try partial match
  const allTasks = taskTracker.getAllTasks();
  const matches = allTasks.filter((task) =>
    task.id.toLowerCase().startsWith(partialId.toLowerCase())
  );

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    displayError(`Multiple tasks match "${partialId}". Please be more specific.`);
    return undefined;
  }

  return undefined;
}

/**
 * Handle persona subcommands
 * BEGINNER NOTE: This handles commands like /persona, /persona coder, etc.
 *
 * @param args - Command arguments
 * @param agent - Agent instance
 * @returns true to continue chat loop
 */
function handlePersonaCommand(args: string[], agent: Agent): boolean {
  // No args - show current persona
  if (args.length === 0) {
    const currentPersona = agent.getPersona();
    displayPersonaDetail(currentPersona, true);
    return true;
  }

  const subCommand = args[0].toLowerCase();

  // /persona help
  if (subCommand === 'help') {
    displayPersonaHelp();
    return true;
  }

  // /persona info <id>
  if (subCommand === 'info' && args.length > 1) {
    const personaId = args[1].toLowerCase();
    const persona = getPersona(personaId);
    if (!persona) {
      displayError(`Persona not found: ${personaId}`);
      displaySystemMessage('Use /personas to see available personas');
      return true;
    }
    const isCurrent = persona.id === agent.getPersona().id;
    displayPersonaDetail(persona, isCurrent);
    return true;
  }

  // /persona <id> - switch to persona
  const personaId = subCommand;
  const success = agent.setPersona(personaId);

  if (success) {
    const persona = agent.getPersona();
    displaySuccess(`Switched to: ${persona.name}`);
    displaySystemMessage(persona.description);

    // Show temperature change if applicable
    if (persona.recommendedTemperature !== undefined) {
      displaySystemMessage(`Temperature set to ${persona.recommendedTemperature} (recommended for this persona)`);
    }
  } else {
    displayError(`Persona not found: ${personaId}`);
    displaySystemMessage('Use /personas to see available personas');
  }

  return true;
}

/**
 * Handle context subcommands
 * BEGINNER NOTE: This handles commands like /context, /context trim, etc.
 *
 * @param args - Command arguments
 * @param agent - Agent instance
 * @returns true to continue chat loop
 */
function handleContextCommand(args: string[], agent: Agent): boolean {
  // No args - show current context status
  if (args.length === 0) {
    displayContextStats(agent);
    return true;
  }

  const subCommand = args[0].toLowerCase();

  switch (subCommand) {
    case 'help':
      displayContextHelp();
      return true;

    case 'trim':
      // Force context trimming
      const trimResult = agent.trimContext();
      if (trimResult instanceof Promise) {
        trimResult.then((result) => {
          if (result.messagesRemoved > 0) {
            displaySuccess(`Trimmed ${result.messagesRemoved} messages, freed ~${result.tokensFreed} tokens`);
          } else {
            displaySystemMessage('No trimming needed - context is within limits');
          }
        });
      }
      return true;

    case 'config':
      // Show current context configuration
      const config = agent.getContextConfig();
      displaySystemMessage('Context Configuration:');
      displaySystemMessage(`  Strategy: ${config.strategy}`);
      displaySystemMessage(`  Max Tokens: ${config.maxContextTokens.toLocaleString()}`);
      displaySystemMessage(`  Warning at: ${Math.round(config.warningThreshold * 100)}%`);
      displaySystemMessage(`  Action at: ${Math.round(config.actionThreshold * 100)}%`);
      displaySystemMessage(`  Keep recent: ${config.keepRecentMessages} messages`);
      return true;

    case 'strategy':
      // Change strategy
      if (args.length < 2) {
        displayError('Please specify a strategy: none, sliding_window, or summarize');
        return true;
      }
      const strategy = args[1].toLowerCase();
      if (!['none', 'sliding_window', 'summarize'].includes(strategy)) {
        displayError('Invalid strategy. Use: none, sliding_window, or summarize');
        return true;
      }
      agent.configureContext({ strategy: strategy as 'none' | 'sliding_window' | 'summarize' });
      displaySuccess(`Context strategy changed to: ${strategy}`);
      return true;

    default:
      displayError(`Unknown context command: ${subCommand}`);
      displayContextHelp();
      return true;
  }
}

/**
 * Display context statistics
 */
function displayContextStats(agent: Agent): void {
  const stats = agent.getContextStats();
  const config = agent.getContextConfig();
  const percent = Math.round(stats.percentUsed * 100);

  displaySeparator();
  displaySystemMessage('📊 Context Window Status');
  displaySeparator();

  // Usage bar visualization
  const barLength = 30;
  const filled = Math.round(barLength * stats.percentUsed);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  let statusColor = '🟢'; // Green
  if (stats.needsAction) {
    statusColor = '🔴'; // Red
  } else if (stats.isWarning) {
    statusColor = '🟡'; // Yellow
  }

  displaySystemMessage(`${statusColor} [${bar}] ${percent}%`);
  displaySystemMessage('');
  displaySystemMessage(`Tokens: ${stats.estimatedTotal.toLocaleString()} / ${config.maxContextTokens.toLocaleString()}`);
  displaySystemMessage(`Remaining: ~${stats.remaining.toLocaleString()} tokens`);
  displaySystemMessage(`Messages: ${stats.messageCount}`);
  displaySystemMessage(`Avg per message: ~${stats.avgTokensPerMessage} tokens`);
  displaySystemMessage(`Strategy: ${config.strategy}`);

  if (stats.needsAction) {
    displayError('⚠️  Context limit reached! Messages will be trimmed on next API call.');
  } else if (stats.isWarning) {
    displaySystemMessage('⚡ Approaching context limit - consider using /clear or /context trim');
  }

  // Show summary if exists
  const summary = agent.getContextSummary();
  if (summary) {
    displaySystemMessage('');
    displaySystemMessage('📝 Earlier conversation summary:');
    displaySystemMessage(`   ${summary}`);
  }

  displaySeparator();
}

/**
 * Display context command help
 */
function displayContextHelp(): void {
  displaySeparator();
  displaySystemMessage('📚 Context Commands');
  displaySeparator();
  displaySystemMessage('/context              Show context window usage');
  displaySystemMessage('/context help         Show this help');
  displaySystemMessage('/context config       Show context configuration');
  displaySystemMessage('/context trim         Force trim old messages');
  displaySystemMessage('/context strategy <s> Change strategy (none, sliding_window, summarize)');
  displaySeparator();
}

// ============================================
// Session Command Handlers (Phase 9)
// ============================================

/**
 * Handle /save command
 * BEGINNER NOTE: Saves the current conversation to disk
 */
async function handleSaveCommand(args: string[], agent: Agent): Promise<boolean> {
  // Optional title from args
  const title = args.length > 0 ? args.join(' ') : undefined;

  const result = await agent.saveConversation(title);

  if (result.success) {
    displaySuccess(`Conversation saved!`);
    displaySystemMessage(`ID: ${agent.getConversationId()}`);
    displaySystemMessage(`File: ${result.filePath}`);
  } else {
    displayError(`Failed to save: ${result.error}`);
  }

  return true;
}

/**
 * Handle /load command
 * BEGINNER NOTE: Loads a previously saved conversation
 */
async function handleLoadCommand(args: string[], agent: Agent): Promise<boolean> {
  if (args.length === 0) {
    displayError('Please provide a conversation ID');
    displaySystemMessage('Usage: /load <conversation-id>');
    displaySystemMessage('Use /sessions to see available conversations');
    return true;
  }

  const conversationId = args[0];
  const result = await agent.loadConversation(conversationId);

  if (result.success) {
    displaySuccess(`Conversation loaded: ${agent.getConversationTitle()}`);
    displaySystemMessage(`Messages: ${agent.getState().messageCount}`);
    displaySystemMessage('Use /history to see the conversation');
  } else {
    displayError(`Failed to load: ${result.error}`);
  }

  return true;
}

/**
 * Handle /sessions command
 * BEGINNER NOTE: Lists all saved conversations
 */
async function handleSessionsCommand(agent: Agent): Promise<boolean> {
  const sessions = await agent.listSavedConversations();

  if (sessions.length === 0) {
    displaySystemMessage('No saved conversations found.');
    displaySystemMessage('Use /save to save the current conversation.');
    return true;
  }

  displaySeparator();
  displaySystemMessage('💾 Saved Conversations');
  displaySeparator();

  for (const session of sessions) {
    const date = session.updatedAt.toLocaleDateString();
    const time = session.updatedAt.toLocaleTimeString();
    const shortId = session.id.substring(0, 8);

    displaySystemMessage(`[${shortId}] ${session.title}`);
    displaySystemMessage(`   ${session.messageCount} messages | ${date} ${time}`);
    displaySystemMessage(`   ${session.previewText}`);
    displaySystemMessage('');
  }

  displaySeparator();
  displaySystemMessage('Use /load <id> to load a conversation');
  displaySystemMessage('Use /session delete <id> to delete');

  return true;
}

/**
 * Handle /session subcommands
 */
async function handleSessionCommand(args: string[], agent: Agent): Promise<boolean> {
  if (args.length === 0) {
    displaySessionHelp();
    return true;
  }

  const subCommand = args[0].toLowerCase();

  switch (subCommand) {
    case 'help':
      displaySessionHelp();
      return true;

    case 'info':
      // Show current session info
      displaySeparator();
      displaySystemMessage('📋 Current Session');
      displaySeparator();
      displaySystemMessage(`ID: ${agent.getConversationId()}`);
      displaySystemMessage(`Title: ${agent.getConversationTitle()}`);
      displaySystemMessage(`Messages: ${agent.getState().messageCount}`);
      displaySystemMessage(`Tokens used: ${agent.getTokenUsage().total}`);
      displaySeparator();
      return true;

    case 'title':
      if (args.length < 2) {
        displayError('Please provide a title');
        displaySystemMessage('Usage: /session title <new title>');
        return true;
      }
      const newTitle = args.slice(1).join(' ');
      agent.setConversationTitle(newTitle);
      displaySuccess(`Title set to: ${newTitle}`);
      return true;

    case 'delete':
      if (args.length < 2) {
        displayError('Please provide a conversation ID');
        displaySystemMessage('Usage: /session delete <id>');
        return true;
      }
      const deleteId = args[1];
      const deleted = await agent.deleteSavedConversation(deleteId);
      if (deleted) {
        displaySuccess(`Conversation deleted: ${deleteId}`);
      } else {
        displayError(`Conversation not found: ${deleteId}`);
      }
      return true;

    default:
      displayError(`Unknown session command: ${subCommand}`);
      displaySessionHelp();
      return true;
  }
}

/**
 * Display session command help
 */
function displaySessionHelp(): void {
  displaySeparator();
  displaySystemMessage('📚 Session Commands');
  displaySeparator();
  displaySystemMessage('/save [title]         Save current conversation');
  displaySystemMessage('/load <id>            Load a saved conversation');
  displaySystemMessage('/sessions             List all saved conversations');
  displaySystemMessage('/session info         Show current session info');
  displaySystemMessage('/session title <t>    Set conversation title');
  displaySystemMessage('/session delete <id>  Delete a saved conversation');
  displaySeparator();
}

// ============================================
// Image Command Handlers (Phase 12)
// ============================================

/**
 * Parse image command arguments, handling quoted paths
 * BEGINNER NOTE: Paths with spaces need quotes, e.g., "/image "C:\My Photos\pic.jpg" What is this?"
 *
 * @param rawArgs - The raw argument string (everything after /image)
 * @returns { path: string, question?: string } or null if invalid
 */
function parseImageArgs(rawArgs: string): { path: string; question?: string } | null {
  const trimmed = rawArgs.trim();
  if (!trimmed) return null;

  // Check if path is quoted
  if (trimmed.startsWith('"')) {
    // Find the closing quote
    const endQuote = trimmed.indexOf('"', 1);
    if (endQuote === -1) {
      // No closing quote - treat entire string as path
      return { path: trimmed.slice(1) };
    }
    const path = trimmed.slice(1, endQuote);
    const rest = trimmed.slice(endQuote + 1).trim();
    return { path, question: rest || undefined };
  }

  // No quotes - split on first space
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return { path: trimmed };
  }

  return {
    path: trimmed.slice(0, spaceIndex),
    question: trimmed.slice(spaceIndex + 1).trim() || undefined,
  };
}

/**
 * Handle /image command
 * BEGINNER NOTE: Send images to Claude for analysis
 *
 * @param args - Command arguments
 * @param agent - Agent instance
 * @param rawCommand - The full raw command string
 * @returns true to continue chat loop
 */
async function handleImageCommand(args: string[], agent: Agent, rawCommand?: string): Promise<boolean> {
  // No args - show help
  if (args.length === 0) {
    displayImageHelp();
    return true;
  }

  const subCommand = args[0].toLowerCase();

  // Check for subcommands
  if (subCommand === 'help') {
    displayImageHelp();
    return true;
  }

  // For 'info' subcommand, rejoin args to handle spaces
  if (subCommand === 'info') {
    const infoArgs = rawCommand ? rawCommand.replace(/^\/image\s+info\s*/i, '') : args.slice(1).join(' ');
    const parsed = parseImageArgs(infoArgs);
    if (!parsed) {
      displayError('Please provide an image path');
      displaySystemMessage('Usage: /image info <path> or /image info "<path with spaces>"');
      return true;
    }
    return await handleImageInspect(parsed.path, agent);
  }

  // Parse the image path and question
  // Use raw command if available to preserve spaces in quoted paths
  const imageArgs = rawCommand ? rawCommand.replace(/^\/image\s*/i, '') : args.join(' ');
  const parsed = parseImageArgs(imageArgs);

  if (!parsed) {
    displayImageHelp();
    return true;
  }

  return await handleImageChat(parsed.path, parsed.question, agent);
}

/**
 * Handle sending an image to Claude
 */
async function handleImageChat(
  imagePath: string,
  question: string | undefined,
  agent: Agent
): Promise<boolean> {
  try {
    displaySystemMessage(`📷 Loading image: ${imagePath}`);

    // Set up streaming callbacks
    let isFirstChunk = true;
    const streamCallbacks: StreamCallbacks = {
      onText: (text) => {
        if (isFirstChunk) {
          startStreamingResponse();
          isFirstChunk = false;
        }
        writeStreamChunk(text);
      },
      onToolUse: (toolName) => {
        if (!isFirstChunk) {
          endStreamingResponse();
        }
        displayToolUseNotification(toolName);
        isFirstChunk = true;
      },
      onComplete: () => {
        if (!isFirstChunk) {
          endStreamingResponse();
        }
      },
      onError: (error) => {
        displayStreamError(error);
      },
    };

    // Send image with streaming response
    await agent.chatWithImageStream(imagePath, question, streamCallbacks);

    return true;
  } catch (error) {
    if (error instanceof Error) {
      displayError(error.message);
    } else {
      displayError('Failed to process image');
    }
    return true;
  }
}

/**
 * Handle inspecting an image (without sending)
 */
async function handleImageInspect(imagePath: string, agent: Agent): Promise<boolean> {
  try {
    displaySystemMessage(`🔍 Inspecting image: ${imagePath}`);

    const info = await agent.inspectImage(imagePath);

    displaySeparator();
    displaySystemMessage('📷 Image Information');
    displaySeparator();
    displaySystemMessage(`Source: ${info.source}`);
    displaySystemMessage(`Type: ${info.mediaType}`);
    displaySystemMessage(`Size: ${formatFileSize(info.sizeBytes)}`);
    displaySystemMessage(`Estimated tokens: ~${info.estimatedTokens}`);
    displaySeparator();
    displaySystemMessage('Use /image <path> to send this image to Claude');

    return true;
  } catch (error) {
    if (error instanceof Error) {
      displayError(error.message);
    } else {
      displayError('Failed to inspect image');
    }
    return true;
  }
}

/**
 * Display image command help
 */
function displayImageHelp(): void {
  displaySeparator();
  displaySystemMessage('📷 Image Commands (Phase 12: Vision)');
  displaySeparator();
  displaySystemMessage('/image <path> [question]  Send an image to Claude');
  displaySystemMessage('/image info <path>        Inspect image without sending');
  displaySystemMessage('/image help               Show this help');
  displaySeparator();
  displaySystemMessage('Examples:');
  displaySystemMessage('  /image ./photo.jpg');
  displaySystemMessage('  /image ./diagram.png What does this show?');
  displaySystemMessage('  /image https://example.com/image.jpg Describe this');
  displaySeparator();
  displaySystemMessage('Paths with spaces - use quotes:');
  displaySystemMessage('  /image "C:\\My Photos\\vacation.jpg" What is this?');
  displaySystemMessage('  /image "C:\\Users\\name\\Pictures\\From Phone\\pic.jpg"');
  displaySeparator();
  displaySystemMessage(`Supported formats: ${getSupportedExtensions().join(', ')}`);
  displaySeparator();
}

/**
 * Start an interactive chat session
 * BEGINNER NOTE: This is the main chat loop - it keeps running until the user exits
 *
 * @param agent - The agent to chat with
 * @param taskTracker - Optional task tracker for task management
 */
export async function startChatSession(
  agent: Agent,
  taskTracker?: TaskTracker
): Promise<void> {
  // Display welcome and help
  displayWelcome();
  displaySystemMessage('Welcome to the interactive chat! Type /help for commands.');
  if (taskTracker) {
    displaySystemMessage(`Task tracking enabled. ${taskTracker.getTaskCount()} task(s) loaded.`);
  }
  displaySeparator();

  // Main chat loop
  let shouldContinue = true;

  while (shouldContinue) {
    try {
      // Get user input
      const userMessage = await getUserMessage();

      // Check if it's a command
      if (isCommand(userMessage)) {
        shouldContinue = await handleCommand(userMessage, agent, taskTracker);
        continue;
      }

      // Display user message
      displayUserMessage(userMessage);

      // Set up streaming callbacks
      let isFirstChunk = true;
      const streamCallbacks: StreamCallbacks = {
        onText: (text) => {
          if (isFirstChunk) {
            startStreamingResponse();
            isFirstChunk = false;
          }
          writeStreamChunk(text);
        },
        onToolUse: (toolName) => {
          if (!isFirstChunk) {
            endStreamingResponse();
          }
          displayToolUseNotification(toolName);
          isFirstChunk = true;
        },
        onComplete: () => {
          if (!isFirstChunk) {
            endStreamingResponse();
          }
        },
        onError: (error) => {
          displayStreamError(error);
        },
      };

      // Get streaming response from agent
      await agent.chatStream(userMessage, streamCallbacks);

    } catch (error) {
      // Handle errors gracefully
      if (error instanceof Error) {
        // Check if it's a Ctrl+C interrupt
        if (error.message.includes('User force closed')) {
          displaySystemMessage('\nGoodbye! Thanks for chatting.');
          break;
        }

        displayError(error.message);
        logger.error('Chat error:', error);

        // Ask if user wants to continue
        const shouldRetry = await confirmAction('Would you like to continue chatting?');
        if (!shouldRetry) {
          shouldContinue = false;
        }
      } else {
        displayError('An unknown error occurred');
        shouldContinue = false;
      }
    }
  }

  // Display final statistics
  displaySeparator();
  const state = agent.getState();
  const tokenUsage = agent.getTokenUsage();
  displayStats({
    messageCount: state.messageCount,
    totalTokens: tokenUsage.total,
    avgTokensPerMessage: tokenUsage.perMessage,
    conversationId: state.currentConversationId || 'N/A',
  });
}

/**
 * Export the chat session starter
 */
export { startChatSession as chat };
