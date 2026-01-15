/**
 * CLI Commands
 *
 * Handles command execution and the interactive chat loop.
 *
 * BEGINNER NOTE: This file contains the logic for the interactive chat session.
 * It's the "game loop" that keeps asking for input and showing responses.
 */

import { Agent } from '../agent/Agent.js';
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
 * @returns true if should continue chat loop, false if should exit
 */
async function handleCommand(command: string, agent: Agent): Promise<boolean> {
  const cmd = command.toLowerCase().trim();

  switch (cmd) {
    case '/help':
      displayHelp();
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

    default:
      displayError(`Unknown command: ${cmd}`);
      displaySystemMessage('Type /help to see available commands');
      return true;
  }
}

/**
 * Start an interactive chat session
 * BEGINNER NOTE: This is the main chat loop - it keeps running until the user exits
 *
 * @param agent - The agent to chat with
 */
export async function startChatSession(agent: Agent): Promise<void> {
  // Display welcome and help
  displayWelcome();
  displaySystemMessage('Welcome to the interactive chat! Type /help for commands.');
  displaySeparator();

  // Main chat loop
  let shouldContinue = true;

  while (shouldContinue) {
    try {
      // Get user input
      const userMessage = await getUserMessage();

      // Check if it's a command
      if (isCommand(userMessage)) {
        shouldContinue = await handleCommand(userMessage, agent);
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
