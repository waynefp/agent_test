/**
 * CLI Display Utilities
 *
 * Functions for formatting and displaying output in the terminal.
 *
 * BEGINNER NOTE: These functions make the terminal output pretty and easy to read.
 */

import chalk from 'chalk';

/**
 * Display a welcome message
 */
export function displayWelcome(): void {
  console.log();
  console.log(chalk.bold.cyan('╔═══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║                                                       ║'));
  console.log(chalk.bold.cyan('║          Agent SDK Learning Project                   ║'));
  console.log(chalk.bold.cyan('║          Interactive Chat with Claude                 ║'));
  console.log(chalk.bold.cyan('║                                                       ║'));
  console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════╝'));
  console.log();
}

/**
 * Display help information
 */
export function displayHelp(): void {
  console.log();
  console.log(chalk.bold.white('Available Commands:'));
  console.log();
  console.log(chalk.cyan('  /help') + '     - Show this help message');
  console.log(chalk.cyan('  /clear') + '    - Clear conversation history');
  console.log(chalk.cyan('  /history') + '  - Show conversation history');
  console.log(chalk.cyan('  /stats') + '    - Show agent statistics');
  console.log(chalk.cyan('  /exit') + '     - Exit the chat');
  console.log(chalk.cyan('  /quit') + '     - Exit the chat');
  console.log();
  console.log(chalk.gray('Just type your message and press Enter to chat!'));
  console.log();
}

/**
 * Display a user message
 * BEGINNER NOTE: Shows what the user typed in a colored format
 */
export function displayUserMessage(message: string): void {
  console.log();
  console.log(chalk.bold.blue('You: ') + chalk.white(message));
}

/**
 * Display an assistant message
 * BEGINNER NOTE: Shows Claude's response in a colored format
 */
export function displayAssistantMessage(message: string): void {
  console.log();
  console.log(chalk.bold.green('Assistant: ') + chalk.white(message));
  console.log();
}

/**
 * Display a system message
 * BEGINNER NOTE: Shows informational messages from the system
 */
export function displaySystemMessage(message: string): void {
  console.log();
  console.log(chalk.gray('ℹ  ') + chalk.gray(message));
  console.log();
}

/**
 * Display an error message
 */
export function displayError(message: string): void {
  console.log();
  console.log(chalk.bold.red('✗ Error: ') + chalk.red(message));
  console.log();
}

/**
 * Display a success message
 */
export function displaySuccess(message: string): void {
  console.log();
  console.log(chalk.bold.green('✓ ') + chalk.green(message));
  console.log();
}

/**
 * Display a warning message
 */
export function displayWarning(message: string): void {
  console.log();
  console.log(chalk.bold.yellow('⚠  ') + chalk.yellow(message));
  console.log();
}

/**
 * Display conversation history
 */
export function displayHistory(conversationText: string): void {
  console.log();
  console.log(chalk.bold.white('=== Conversation History ==='));
  console.log();
  console.log(conversationText);
  console.log();
}

/**
 * Display agent statistics
 */
export function displayStats(stats: {
  messageCount: number;
  totalTokens: number;
  avgTokensPerMessage: number;
  conversationId: string;
}): void {
  console.log();
  console.log(chalk.bold.white('=== Agent Statistics ==='));
  console.log();
  console.log(chalk.cyan('  Conversation ID: ') + chalk.white(stats.conversationId));
  console.log(chalk.cyan('  Messages: ') + chalk.white(stats.messageCount.toString()));
  console.log(chalk.cyan('  Total Tokens Used: ') + chalk.white(stats.totalTokens.toString()));
  console.log(
    chalk.cyan('  Avg Tokens/Message: ') +
    chalk.white(stats.avgTokensPerMessage.toString())
  );
  console.log();
}

/**
 * Display a separator line
 */
export function displaySeparator(): void {
  console.log(chalk.gray('─'.repeat(60)));
}

/**
 * Display a loading indicator
 * BEGINNER NOTE: Shows the user that we're waiting for Claude's response
 */
export function displayThinking(): void {
  console.log();
  console.log(chalk.gray('  Thinking...'));
}

/**
 * Clear the console
 */
export function clearScreen(): void {
  console.clear();
  displayWelcome();
}
