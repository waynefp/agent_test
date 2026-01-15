/**
 * Logger Utility
 *
 * A simple, colorful logger for console output.
 * Uses chalk for colors to make debugging easier and output more readable.
 *
 * BEGINNER NOTE: Logging is essential for understanding what your code is doing.
 * Instead of console.log everywhere, use this logger with different levels.
 */

import chalk from 'chalk';
import { LOG_LEVEL } from '../config/environment.js';

/**
 * Log levels in order of severity
 * BEGINNER NOTE: Different levels help you filter what you see
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Numeric values for log levels (for comparison)
 */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger class with colored output
 * BEGINNER NOTE: Create a logger instance and use it throughout your code
 */
export class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  /**
   * Check if a message at the given level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[this.minLevel];
  }

  /**
   * Format a timestamp
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
  }

  /**
   * Log a debug message (gray color)
   * BEGINNER NOTE: Use for detailed debugging info you don't always need
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;

    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.gray('[DEBUG]');
    console.log(timestamp, level, chalk.gray(message), ...args);
  }

  /**
   * Log an info message (blue color)
   * BEGINNER NOTE: Use for general information about what's happening
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;

    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.blue('[INFO]');
    console.log(timestamp, level, chalk.blue(message), ...args);
  }

  /**
   * Log a success message (green color)
   * BEGINNER NOTE: Use when something completes successfully
   */
  success(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;

    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.green('[SUCCESS]');
    console.log(timestamp, level, chalk.green(message), ...args);
  }

  /**
   * Log a warning message (yellow color)
   * BEGINNER NOTE: Use for things that might be problems but aren't errors
   */
  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;

    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.yellow('[WARN]');
    console.warn(timestamp, level, chalk.yellow(message), ...args);
  }

  /**
   * Log an error message (red color)
   * BEGINNER NOTE: Use when something goes wrong
   */
  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;

    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.red('[ERROR]');
    console.error(timestamp, level, chalk.red(message), ...args);

    // If an error object is provided, log its stack trace
    if (error instanceof Error) {
      console.error(chalk.red(error.stack || error.message));
    } else if (error) {
      console.error(chalk.red(JSON.stringify(error, null, 2)));
    }
  }

  /**
   * Log a tool call (cyan color)
   * BEGINNER NOTE: Special logger for when tools are called
   */
  tool(toolName: string, action: string, details?: unknown): void {
    if (!this.shouldLog('info')) return;

    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.cyan('[TOOL]');
    const tool = chalk.cyan.bold(toolName);
    console.log(timestamp, level, tool, chalk.cyan(action));

    if (details) {
      console.log(chalk.gray(JSON.stringify(details, null, 2)));
    }
  }

  /**
   * Log an agent action (magenta color)
   * BEGINNER NOTE: Special logger for agent-related actions
   */
  agent(action: string, details?: unknown): void {
    if (!this.shouldLog('info')) return;

    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.magenta('[AGENT]');
    console.log(timestamp, level, chalk.magenta(action));

    if (details) {
      console.log(chalk.gray(JSON.stringify(details, null, 2)));
    }
  }

  /**
   * Log a task update (green color)
   * BEGINNER NOTE: Special logger for task tracking
   */
  task(taskId: string, status: string, description?: string): void {
    if (!this.shouldLog('info')) return;

    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const level = chalk.green('[TASK]');
    const id = chalk.gray(`[${taskId}]`);
    const statusColor =
      status === 'completed'
        ? chalk.green(status)
        : status === 'failed'
        ? chalk.red(status)
        : status === 'in-progress'
        ? chalk.yellow(status)
        : chalk.blue(status);

    console.log(timestamp, level, id, statusColor);

    if (description) {
      console.log(chalk.gray(`  ${description}`));
    }
  }

  /**
   * Log a separator line
   * BEGINNER NOTE: Use to visually separate sections of output
   */
  separator(char: string = '-', length: number = 80): void {
    console.log(chalk.gray(char.repeat(length)));
  }

  /**
   * Log a header
   * BEGINNER NOTE: Use for section titles
   */
  header(text: string): void {
    const line = '='.repeat(text.length + 4);
    console.log(chalk.bold.white(`\n${line}`));
    console.log(chalk.bold.white(`  ${text}`));
    console.log(chalk.bold.white(`${line}\n`));
  }

  /**
   * Change the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.minLevel;
  }
}

/**
 * Default logger instance
 * BEGINNER NOTE: Import this and use it anywhere in your code:
 * import { logger } from '@utils/logger';
 * logger.info('Hello!');
 */
export const logger = new Logger(LOG_LEVEL);

/**
 * Create a new logger with a specific level
 * BEGINNER NOTE: Use this if you want a logger with different settings
 */
export function createLogger(level: LogLevel = 'info'): Logger {
  return new Logger(level);
}
