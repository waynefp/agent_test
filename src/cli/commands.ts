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
import { ConversationPersistence } from '../persistence/ConversationPersistence.js';
import { getUserMessage, confirmAction } from './prompts.js';
import {
  displayWelcome,
  displayHelp,
  displayUserMessage,
  displayAssistantMessage,
  displaySystemMessage,
  displayError,
  displaySuccess,
  displayHistory,
  displayStats,
  displaySeparator,
  displayThinking,
  clearScreen,
  displayTasks,
  displayTaskDetail,
  displayTaskStats,
  displayTaskHelp,
} from './display.js';
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
 * @param conversationPersistence - Optional conversation persistence instance
 * @returns true if should continue chat loop, false if should exit
 */
async function handleCommand(
  command: string,
  agent: Agent,
  taskTracker?: TaskTracker,
  conversationPersistence?: ConversationPersistence
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
    // Conversation Persistence Commands (Phase 6)
    // ============================================

    case '/save':
      if (!conversationPersistence) {
        displayError('Conversation persistence is not enabled');
        return true;
      }
      return await handleSaveConversation(agent, conversationPersistence, args);

    case '/load':
      if (!conversationPersistence) {
        displayError('Conversation persistence is not enabled');
        return true;
      }
      return await handleLoadConversation(agent, conversationPersistence, args);

    case '/sessions':
      if (!conversationPersistence) {
        displayError('Conversation persistence is not enabled');
        return true;
      }
      return await handleListSessions(conversationPersistence);

    case '/delete-session':
      if (!conversationPersistence) {
        displayError('Conversation persistence is not enabled');
        return true;
      }
      return await handleDeleteSession(conversationPersistence, args);

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
 * Handle saving the current conversation
 * BEGINNER NOTE: Saves the current conversation to a JSON file
 *
 * @param agent - Agent instance with current conversation
 * @param persistence - ConversationPersistence instance
 * @param args - Command arguments (optional title)
 * @returns true to continue chat loop
 */
async function handleSaveConversation(
  agent: Agent,
  persistence: ConversationPersistence,
  args: string[]
): Promise<boolean> {
  try {
    const conversation = agent.getConversation();

    if (conversation.messages.length === 0) {
      displayError('Cannot save empty conversation');
      return true;
    }

    // Set title if provided
    if (args.length > 0) {
      const title = args.join(' ');
      agent.setConversationTitle(title);
    }

    // Save the conversation
    await persistence.save(conversation);

    const title = conversation.title || 'Untitled';
    displaySuccess(`Conversation saved: "${title}"`);
    displaySystemMessage(`ID: ${conversation.id}`);
    displaySystemMessage(`Messages: ${conversation.messages.length}`);

  } catch (error) {
    displayError(`Failed to save conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return true;
}

/**
 * Handle loading a saved conversation
 * BEGINNER NOTE: Loads a conversation from disk and replaces the current one
 *
 * @param agent - Agent instance
 * @param persistence - ConversationPersistence instance
 * @param args - Command arguments (conversation ID)
 * @returns true to continue chat loop
 */
async function handleLoadConversation(
  agent: Agent,
  persistence: ConversationPersistence,
  args: string[]
): Promise<boolean> {
  if (args.length === 0) {
    displayError('Please provide a conversation ID');
    displaySystemMessage('Usage: /load <id>');
    displaySystemMessage('Tip: Use /sessions to see available conversations');
    return true;
  }

  const conversationId = args[0];

  try {
    // Confirm if current conversation has unsaved changes
    const currentConv = agent.getConversation();
    if (currentConv.messages.length > 0) {
      const confirmed = await confirmAction(
        'Loading will replace your current conversation. Continue?'
      );
      if (!confirmed) {
        return true;
      }
    }

    // Load the conversation
    const conversation = await persistence.load(conversationId);

    // Load into agent
    agent.loadConversation(conversation);

    const title = conversation.title || 'Untitled';
    displaySuccess(`Conversation loaded: "${title}"`);
    displaySystemMessage(`ID: ${conversation.id}`);
    displaySystemMessage(`Messages: ${conversation.messages.length}`);
    displaySystemMessage(`Created: ${conversation.createdAt.toLocaleString()}`);
    displaySystemMessage(`Updated: ${conversation.updatedAt.toLocaleString()}`);

  } catch (error) {
    displayError(`Failed to load conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return true;
}

/**
 * Handle listing all saved conversations
 * BEGINNER NOTE: Shows all saved conversations with their details
 *
 * @param persistence - ConversationPersistence instance
 * @returns true to continue chat loop
 */
async function handleListSessions(
  persistence: ConversationPersistence
): Promise<boolean> {
  try {
    const sessions = await persistence.list();

    if (sessions.length === 0) {
      displaySystemMessage('No saved conversations found.');
      displaySystemMessage('Save the current conversation with /save [title]');
      return true;
    }

    displaySystemMessage(`\nSaved Conversations (${sessions.length}):`);
    displaySeparator();

    for (const session of sessions) {
      const title = session.title || 'Untitled';
      const updated = session.updatedAt.toLocaleString();

      console.log(`📝 ${title}`);
      console.log(`   ID: ${session.id}`);
      console.log(`   Messages: ${session.messageCount}`);
      console.log(`   Updated: ${updated}`);
      console.log('');
    }

    displaySystemMessage('Use /load <id> to load a conversation');
    displaySystemMessage('Use /delete-session <id> to delete a conversation');

  } catch (error) {
    displayError(`Failed to list sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return true;
}

/**
 * Handle deleting a saved conversation
 * BEGINNER NOTE: Permanently deletes a conversation file
 *
 * @param persistence - ConversationPersistence instance
 * @param args - Command arguments (conversation ID)
 * @returns true to continue chat loop
 */
async function handleDeleteSession(
  persistence: ConversationPersistence,
  args: string[]
): Promise<boolean> {
  if (args.length === 0) {
    displayError('Please provide a conversation ID');
    displaySystemMessage('Usage: /delete-session <id>');
    return true;
  }

  const conversationId = args[0];

  try {
    // Load to show what we're deleting
    const conversation = await persistence.load(conversationId);
    const title = conversation.title || 'Untitled';

    const confirmed = await confirmAction(
      `Delete conversation "${title}" (${conversation.messages.length} messages)?`
    );

    if (!confirmed) {
      return true;
    }

    await persistence.delete(conversationId);
    displaySuccess(`Conversation deleted: "${title}"`);

  } catch (error) {
    displayError(`Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return true;
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
 * Start an interactive chat session
 * BEGINNER NOTE: This is the main chat loop - it keeps running until the user exits
 *
 * @param agent - The agent to chat with
 * @param taskTracker - Optional task tracker for task management
 * @param conversationPersistence - Optional conversation persistence for saving/loading
 */
export async function startChatSession(
  agent: Agent,
  taskTracker?: TaskTracker,
  conversationPersistence?: ConversationPersistence
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
        shouldContinue = await handleCommand(userMessage, agent, taskTracker, conversationPersistence);
        continue;
      }

      // Display user message
      displayUserMessage(userMessage);

      // Show thinking indicator
      displayThinking();

      // Get response from agent
      const response = await agent.chat(userMessage);

      // Display assistant response
      displayAssistantMessage(response);

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
