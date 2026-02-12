/**
 * CLI Display Utilities
 *
 * Functions for formatting and displaying output in the terminal.
 *
 * BEGINNER NOTE: These functions make the terminal output pretty and easy to read.
 */

import chalk from 'chalk';
import type { Task, TaskStatistics, TaskNode } from '../types/task.types.js';
import type { Persona } from '../config/personas.js';

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
  console.log(chalk.cyan('  /help') + '      - Show this help message');
  console.log(chalk.cyan('  /clear') + '     - Clear conversation history');
  console.log(chalk.cyan('  /history') + '   - Show conversation history');
  console.log(chalk.cyan('  /stats') + '     - Show agent statistics');
  console.log(chalk.cyan('  /context') + '   - Show context window usage');
  console.log(chalk.cyan('  /image') + '     - Send an image to Claude');
  console.log(chalk.cyan('  /thinking') + '  - Toggle extended thinking on/off');
  console.log(chalk.cyan('  /thinking-budget') + ' - Set thinking token budget');
  console.log(chalk.cyan('  /save') + '      - Save current conversation');
  console.log(chalk.cyan('  /load') + '      - Load a saved conversation');
  console.log(chalk.cyan('  /sessions') + '  - List saved conversations');
  console.log(chalk.cyan('  /personas') + '  - List available personas');
  console.log(chalk.cyan('  /persona') + '   - Show/change agent persona');
  console.log(chalk.cyan('  /exit') + '      - Exit the chat');
  console.log();
  console.log(chalk.gray('Just type your message and press Enter to chat!'));
  console.log(chalk.gray('Use /image <path> to send images.'));
  console.log(chalk.gray('Use /thinking to enable step-by-step reasoning.'));
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

// ============================================
// Streaming Display Functions (Phase 6)
// ============================================

/**
 * Start streaming assistant output
 * BEGINNER NOTE: Sets up the display for streaming text
 */
export function startStreamingResponse(): void {
  console.log();
  process.stdout.write(chalk.bold.green('Assistant: '));
}

/**
 * Write a text chunk to the streaming output
 * BEGINNER NOTE: Writes text without a newline, so chunks appear in sequence
 */
export function writeStreamChunk(text: string): void {
  process.stdout.write(chalk.white(text));
}

/**
 * End the streaming response
 * BEGINNER NOTE: Adds final newlines after streaming is complete
 */
export function endStreamingResponse(): void {
  console.log();
  console.log();
}

/**
 * Display a tool use notification during streaming
 * BEGINNER NOTE: Shows when Claude is using a tool while streaming
 */
export function displayToolUseNotification(toolName: string): void {
  console.log();
  console.log(chalk.yellow(`  [Using tool: ${toolName}...]`));
  process.stdout.write(chalk.bold.green('Assistant: '));
}

/**
 * Display streaming error
 */
export function displayStreamError(error: Error): void {
  console.log();
  console.log(chalk.bold.red('✗ Streaming error: ') + chalk.red(error.message));
  console.log();
}

/**
 * Clear the console
 */
export function clearScreen(): void {
  console.clear();
  displayWelcome();
}

// ============================================
// Task Display Functions (Phase 5)
// ============================================

/**
 * Get status icon for a task
 */
function getStatusIcon(status: Task['status']): string {
  switch (status) {
    case 'pending':
      return chalk.gray('[ ]');
    case 'in-progress':
      return chalk.yellow('[~]');
    case 'completed':
      return chalk.green('[+]');
    case 'failed':
      return chalk.red('[x]');
    default:
      return chalk.gray('[?]');
  }
}

/**
 * Get priority color
 */
function getPriorityColor(priority: Task['priority']): (text: string) => string {
  switch (priority) {
    case 'urgent':
      return chalk.red;
    case 'high':
      return chalk.yellow;
    case 'medium':
      return chalk.white;
    case 'low':
      return chalk.gray;
    default:
      return chalk.white;
  }
}

/**
 * Display a single task in list format
 */
export function displayTaskListItem(task: Task, indent: number = 0): void {
  const prefix = '  '.repeat(indent);
  const icon = getStatusIcon(task.status);
  const priorityColor = getPriorityColor(task.priority);
  const shortId = task.id.substring(0, 8);

  console.log(
    `${prefix}${icon} ${priorityColor(task.description)} ${chalk.gray(`(${shortId})`)}`
  );
}

/**
 * Display a list of tasks
 */
export function displayTasks(tasks: Task[]): void {
  console.log();

  if (tasks.length === 0) {
    console.log(chalk.gray('  No tasks found.'));
    console.log();
    console.log(chalk.gray('  Use /task add <description> to create a task.'));
    console.log();
    return;
  }

  console.log(chalk.bold.white('=== Tasks ==='));
  console.log();

  for (const task of tasks) {
    displayTaskListItem(task);
  }

  console.log();
  console.log(chalk.gray(`  ${tasks.length} task(s) total`));
  console.log();
}

/**
 * Display a task tree (hierarchical view)
 */
export function displayTaskTree(roots: TaskNode[]): void {
  console.log();

  if (roots.length === 0) {
    console.log(chalk.gray('  No tasks found.'));
    console.log();
    return;
  }

  console.log(chalk.bold.white('=== Task Tree ==='));
  console.log();

  const printNode = (node: TaskNode): void => {
    displayTaskListItem(node.task, node.depth);
    for (const child of node.children) {
      printNode(child);
    }
  };

  for (const root of roots) {
    printNode(root);
  }

  console.log();
}

/**
 * Display detailed task information
 */
export function displayTaskDetail(task: Task): void {
  console.log();
  console.log(chalk.bold.white('=== Task Details ==='));
  console.log();

  const icon = getStatusIcon(task.status);
  const priorityColor = getPriorityColor(task.priority);

  console.log(chalk.cyan('  ID:          ') + chalk.white(task.id));
  console.log(chalk.cyan('  Description: ') + chalk.white(task.description));
  console.log(chalk.cyan('  Status:      ') + icon + ' ' + chalk.white(task.status));
  console.log(chalk.cyan('  Priority:    ') + priorityColor(task.priority));
  console.log(chalk.cyan('  Created:     ') + chalk.white(task.createdAt.toLocaleString()));

  if (task.startedAt) {
    console.log(chalk.cyan('  Started:     ') + chalk.white(task.startedAt.toLocaleString()));
  }

  if (task.completedAt) {
    console.log(chalk.cyan('  Completed:   ') + chalk.white(task.completedAt.toLocaleString()));
  }

  if (task.parentId) {
    console.log(chalk.cyan('  Parent:      ') + chalk.gray(task.parentId.substring(0, 8)));
  }

  if (task.subtaskIds.length > 0) {
    console.log(chalk.cyan('  Subtasks:    ') + chalk.white(task.subtaskIds.length.toString()));
  }

  if (task.metadata) {
    if (task.metadata.error) {
      console.log(chalk.cyan('  Error:       ') + chalk.red(task.metadata.error));
    }
    if (task.metadata.tags && task.metadata.tags.length > 0) {
      console.log(chalk.cyan('  Tags:        ') + chalk.white(task.metadata.tags.join(', ')));
    }
  }

  console.log();
}

/**
 * Display task statistics
 */
export function displayTaskStats(stats: TaskStatistics): void {
  console.log();
  console.log(chalk.bold.white('=== Task Statistics ==='));
  console.log();

  console.log(chalk.cyan('  Total Tasks: ') + chalk.white(stats.total.toString()));
  console.log();

  console.log(chalk.white('  By Status:'));
  console.log(chalk.gray('    [ ] Pending:     ') + chalk.white(stats.byStatus.pending.toString()));
  console.log(chalk.yellow('    [~] In Progress: ') + chalk.white(stats.byStatus['in-progress'].toString()));
  console.log(chalk.green('    [+] Completed:   ') + chalk.white(stats.byStatus.completed.toString()));
  console.log(chalk.red('    [x] Failed:      ') + chalk.white(stats.byStatus.failed.toString()));
  console.log();

  console.log(chalk.white('  By Priority:'));
  console.log(chalk.red('    Urgent: ') + chalk.white(stats.byPriority.urgent.toString()));
  console.log(chalk.yellow('    High:   ') + chalk.white(stats.byPriority.high.toString()));
  console.log(chalk.white('    Medium: ') + chalk.white(stats.byPriority.medium.toString()));
  console.log(chalk.gray('    Low:    ') + chalk.white(stats.byPriority.low.toString()));

  if (stats.successRate !== undefined) {
    console.log();
    console.log(
      chalk.cyan('  Success Rate: ') +
      chalk.white(`${(stats.successRate * 100).toFixed(1)}%`)
    );
  }

  if (stats.averageCompletionTime !== undefined) {
    console.log(
      chalk.cyan('  Avg Completion: ') +
      chalk.white(`${stats.averageCompletionTime.toFixed(1)}s`)
    );
  }

  console.log();
}

/**
 * Display task help
 */
export function displayTaskHelp(): void {
  console.log();
  console.log(chalk.bold.white('Task Commands:'));
  console.log();
  console.log(chalk.cyan('  /tasks') + '              - List all tasks');
  console.log(chalk.cyan('  /task add <desc>') + '    - Create a new task');
  console.log(chalk.cyan('  /task show <id>') + '     - Show task details');
  console.log(chalk.cyan('  /task start <id>') + '    - Start a task');
  console.log(chalk.cyan('  /task done <id>') + '     - Mark task completed');
  console.log(chalk.cyan('  /task fail <id>') + '     - Mark task failed');
  console.log(chalk.cyan('  /task delete <id>') + '   - Delete a task');
  console.log(chalk.cyan('  /task stats') + '         - Show task statistics');
  console.log(chalk.cyan('  /task clear') + '         - Delete all tasks');
  console.log();
  console.log(chalk.gray('  Tip: You can use the first 8 characters of a task ID'));
  console.log();
}

// ============================================
// Persona Display Functions (Phase 7)
// ============================================

/**
 * Display list of available personas
 */
export function displayPersonas(personas: Persona[], currentId: string): void {
  console.log();
  console.log(chalk.bold.white('=== Available Personas ==='));
  console.log();

  for (const persona of personas) {
    const isCurrent = persona.id === currentId;
    const marker = isCurrent ? chalk.green(' ← current') : '';
    const idDisplay = isCurrent
      ? chalk.green.bold(persona.id)
      : chalk.cyan(persona.id);

    console.log(`  ${idDisplay}: ${chalk.white(persona.name)}${marker}`);
    console.log(chalk.gray(`      ${persona.description}`));
    console.log();
  }

  console.log(chalk.gray('  Use /persona <id> to switch personas'));
  console.log();
}

/**
 * Display detailed persona information
 */
export function displayPersonaDetail(persona: Persona, isCurrent: boolean): void {
  console.log();
  console.log(chalk.bold.white('=== Persona Details ==='));
  console.log();

  const status = isCurrent ? chalk.green(' (current)') : '';
  console.log(chalk.cyan('  ID:          ') + chalk.white(persona.id) + status);
  console.log(chalk.cyan('  Name:        ') + chalk.white(persona.name));
  console.log(chalk.cyan('  Description: ') + chalk.white(persona.description));

  if (persona.recommendedTemperature !== undefined) {
    console.log(chalk.cyan('  Temperature: ') + chalk.white(persona.recommendedTemperature.toString()));
  }

  console.log();
  console.log(chalk.bold.white('  Components:'));
  console.log(chalk.cyan('    Role:  ') + chalk.white(persona.components.role));
  console.log(chalk.cyan('    Style: ') + chalk.white(persona.components.style));

  if (persona.components.focus) {
    console.log(chalk.cyan('    Focus: ') + chalk.white(persona.components.focus));
  }

  if (persona.components.constraints && persona.components.constraints.length > 0) {
    console.log();
    console.log(chalk.cyan('  Constraints:'));
    for (const constraint of persona.components.constraints) {
      console.log(chalk.gray(`    • ${constraint}`));
    }
  }

  if (persona.components.guidelines && persona.components.guidelines.length > 0) {
    console.log();
    console.log(chalk.cyan('  Guidelines:'));
    for (const guideline of persona.components.guidelines) {
      console.log(chalk.gray(`    • ${guideline}`));
    }
  }

  console.log();
}

/**
 * Display persona help
 */
export function displayPersonaHelp(): void {
  console.log();
  console.log(chalk.bold.white('Persona Commands:'));
  console.log();
  console.log(chalk.cyan('  /personas') + '           - List all available personas');
  console.log(chalk.cyan('  /persona') + '            - Show current persona details');
  console.log(chalk.cyan('  /persona <id>') + '       - Switch to a different persona');
  console.log(chalk.cyan('  /persona info <id>') + '  - Show details of a specific persona');
  console.log();
  console.log(chalk.gray('  Personas change how the assistant behaves and communicates.'));
  console.log(chalk.gray('  Available: default, coder, creative, concise, teacher, socratic'));
  console.log();
}
