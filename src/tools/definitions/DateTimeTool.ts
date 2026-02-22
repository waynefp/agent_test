/**
 * DateTime Tool
 *
 * Provides date and time operations including current time, formatting,
 * parsing, and date arithmetic.
 *
 * BEGINNER NOTE: This tool uses native JavaScript Date object and
 * provides common date/time operations that the agent might need.
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';

/**
 * Input schema for the DateTime tool
 * BEGINNER NOTE: Supports multiple operations with different required fields
 */
const DateTimeInputSchema = z.object({
  operation: z.enum(
    [
      'now',           // Get current date/time
      'format',        // Format a date
      'parse',         // Parse a date string
      'add',           // Add time to a date
      'subtract',      // Subtract time from a date
      'diff',          // Calculate difference between dates
      'compare',       // Compare two dates
    ],
    {
      description: 'The date/time operation to perform',
    }
  ),
  date: z.string().optional().describe('ISO 8601 date string (e.g., "2024-01-15T10:30:00Z")'),
  date2: z.string().optional().describe('Second date for comparison or difference operations'),
  format: z
    .enum(['iso', 'date', 'time', 'datetime', 'timestamp', 'locale'])
    .optional()
    .describe('Output format for the result'),
  amount: z.number().optional().describe('Amount to add/subtract'),
  unit: z
    .enum(['milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'])
    .optional()
    .describe('Time unit for add/subtract operations'),
  timezone: z.string().optional().describe('Timezone for formatting (e.g., "America/New_York")'),
});

type DateTimeInput = z.infer<typeof DateTimeInputSchema>;

/**
 * DateTime Tool Implementation
 * BEGINNER NOTE: Handles common date/time operations the agent might need
 */
export class DateTimeTool extends BaseTool {
  readonly name = 'datetime';

  readonly description =
    'Performs date and time operations including getting current time, formatting dates, ' +
    'parsing date strings, date arithmetic (add/subtract), calculating differences, and comparing dates. ' +
    'Use this tool when you need to work with dates and times.';

  readonly inputSchema = DateTimeInputSchema;

  async execute(input: unknown, _options?: ToolExecutionOptions): Promise<ToolResult> {
    const { operation, date, date2, format, amount, unit, timezone } = input as DateTimeInput;

    try {
      let result: any;

      switch (operation) {
        case 'now':
          result = this.getCurrentDateTime(format, timezone);
          break;

        case 'format':
          if (!date) {
            return {
              success: false,
              error: 'Date parameter is required for format operation',
            };
          }
          result = this.formatDate(date, format, timezone);
          break;

        case 'parse':
          if (!date) {
            return {
              success: false,
              error: 'Date parameter is required for parse operation',
            };
          }
          result = this.parseDate(date);
          break;

        case 'add':
          if (!date || amount === undefined || !unit) {
            return {
              success: false,
              error: 'Date, amount, and unit parameters are required for add operation',
            };
          }
          result = this.addTime(date, amount, unit, format);
          break;

        case 'subtract':
          if (!date || amount === undefined || !unit) {
            return {
              success: false,
              error: 'Date, amount, and unit parameters are required for subtract operation',
            };
          }
          result = this.subtractTime(date, amount, unit, format);
          break;

        case 'diff':
          if (!date || !date2) {
            return {
              success: false,
              error: 'Both date and date2 parameters are required for diff operation',
            };
          }
          result = this.calculateDifference(date, date2, unit || 'milliseconds');
          break;

        case 'compare':
          if (!date || !date2) {
            return {
              success: false,
              error: 'Both date and date2 parameters are required for compare operation',
            };
          }
          result = this.compareDates(date, date2);
          break;

        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }

      return {
        success: true,
        data: result,
        metadata: {
          operation,
          timezone: timezone || 'UTC',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          operation,
        },
      };
    }
  }

  /**
   * Get current date/time
   * BEGINNER NOTE: Returns current time in various formats
   */
  private getCurrentDateTime(format?: string, timezone?: string): any {
    const now = new Date();
    return {
      timestamp: now.getTime(),
      iso: now.toISOString(),
      formatted: this.formatDateObject(now, format, timezone),
      timezone: timezone || 'UTC',
    };
  }

  /**
   * Format a date string
   */
  private formatDate(dateStr: string, format?: string, timezone?: string): any {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    return {
      original: dateStr,
      timestamp: date.getTime(),
      formatted: this.formatDateObject(date, format, timezone),
    };
  }

  /**
   * Parse a date string to get detailed information
   */
  private parseDate(dateStr: string): any {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    return {
      original: dateStr,
      timestamp: date.getTime(),
      iso: date.toISOString(),
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
      seconds: date.getUTCSeconds(),
      dayOfWeek: date.getUTCDay(),
      dayOfWeekName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        date.getUTCDay()
      ],
    };
  }

  /**
   * Add time to a date
   */
  private addTime(dateStr: string, amount: number, unit: string, format?: string): any {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    const result = this.modifyDate(date, amount, unit);

    return {
      original: dateStr,
      operation: `add ${amount} ${unit}`,
      result: result.toISOString(),
      timestamp: result.getTime(),
      formatted: this.formatDateObject(result, format),
    };
  }

  /**
   * Subtract time from a date
   */
  private subtractTime(dateStr: string, amount: number, unit: string, format?: string): any {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    const result = this.modifyDate(date, -amount, unit);

    return {
      original: dateStr,
      operation: `subtract ${amount} ${unit}`,
      result: result.toISOString(),
      timestamp: result.getTime(),
      formatted: this.formatDateObject(result, format),
    };
  }

  /**
   * Calculate difference between two dates
   */
  private calculateDifference(dateStr1: string, dateStr2: string, unit: string): any {
    const date1 = new Date(dateStr1);
    const date2 = new Date(dateStr2);

    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
      throw new Error('Invalid date(s)');
    }

    const diffMs = date2.getTime() - date1.getTime();
    const difference = this.convertMilliseconds(diffMs, unit);

    return {
      date1: dateStr1,
      date2: dateStr2,
      difference,
      unit,
      milliseconds: diffMs,
      humanReadable: this.humanReadableDuration(Math.abs(diffMs)),
    };
  }

  /**
   * Compare two dates
   */
  private compareDates(dateStr1: string, dateStr2: string): any {
    const date1 = new Date(dateStr1);
    const date2 = new Date(dateStr2);

    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
      throw new Error('Invalid date(s)');
    }

    const t1 = date1.getTime();
    const t2 = date2.getTime();

    return {
      date1: dateStr1,
      date2: dateStr2,
      equal: t1 === t2,
      before: t1 < t2,
      after: t1 > t2,
      comparison: t1 < t2 ? 'date1 is before date2' : t1 > t2 ? 'date1 is after date2' : 'dates are equal',
    };
  }

  /**
   * Format a Date object according to the specified format
   */
  private formatDateObject(date: Date, format?: string, timezone?: string): string {
    switch (format) {
      case 'iso':
        return date.toISOString();
      case 'date':
        return date.toISOString().split('T')[0];
      case 'time':
        return date.toISOString().split('T')[1].split('.')[0];
      case 'datetime':
        return date.toISOString().replace('T', ' ').split('.')[0];
      case 'timestamp':
        return date.getTime().toString();
      case 'locale':
        return timezone ? date.toLocaleString('en-US', { timeZone: timezone }) : date.toLocaleString();
      default:
        return date.toISOString();
    }
  }

  /**
   * Modify a date by adding/subtracting time
   * BEGINNER NOTE: Negative amounts subtract time
   */
  private modifyDate(date: Date, amount: number, unit: string): Date {
    const result = new Date(date);

    switch (unit) {
      case 'milliseconds':
        result.setMilliseconds(result.getMilliseconds() + amount);
        break;
      case 'seconds':
        result.setSeconds(result.getSeconds() + amount);
        break;
      case 'minutes':
        result.setMinutes(result.getMinutes() + amount);
        break;
      case 'hours':
        result.setHours(result.getHours() + amount);
        break;
      case 'days':
        result.setDate(result.getDate() + amount);
        break;
      case 'weeks':
        result.setDate(result.getDate() + amount * 7);
        break;
      case 'months':
        result.setMonth(result.getMonth() + amount);
        break;
      case 'years':
        result.setFullYear(result.getFullYear() + amount);
        break;
    }

    return result;
  }

  /**
   * Convert milliseconds to specified unit
   */
  private convertMilliseconds(ms: number, unit: string): number {
    switch (unit) {
      case 'milliseconds':
        return ms;
      case 'seconds':
        return ms / 1000;
      case 'minutes':
        return ms / (1000 * 60);
      case 'hours':
        return ms / (1000 * 60 * 60);
      case 'days':
        return ms / (1000 * 60 * 60 * 24);
      case 'weeks':
        return ms / (1000 * 60 * 60 * 24 * 7);
      case 'months':
        return ms / (1000 * 60 * 60 * 24 * 30.44); // Average month
      case 'years':
        return ms / (1000 * 60 * 60 * 24 * 365.25); // Account for leap years
      default:
        return ms;
    }
  }

  /**
   * Convert milliseconds to human-readable duration
   */
  private humanReadableDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day(s), ${hours % 24} hour(s)`;
    if (hours > 0) return `${hours} hour(s), ${minutes % 60} minute(s)`;
    if (minutes > 0) return `${minutes} minute(s), ${seconds % 60} second(s)`;
    return `${seconds} second(s)`;
  }
}

/**
 * Factory function to create a DateTimeTool
 */
export function createDateTimeTool(): DateTimeTool {
  return new DateTimeTool();
}
