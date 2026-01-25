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
