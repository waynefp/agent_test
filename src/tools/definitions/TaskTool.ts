/**
 * Task Tool
 *
 * Allows the agent to create, update, and track tasks.
 * This gives the agent the ability to break complex work into
 * manageable pieces and track its own progress!
 *
 * BEGINNER NOTE: This is how the agent becomes "self-aware" of
 * what it's working on. It can create tasks, mark them complete,
 * and show you what it's doing.
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';
import { TaskTracker } from '../../agent/TaskTracker.js';

/**
 * Input schema for the task tool
 */
const TaskToolInputSchema = z.object({
  operation: z.enum(['create', 'start', 'complete', 'fail', 'list', 'get'], {
    description: 'The task operation to perform',
  }),
  description: z.string({
    description: 'Task description (required for create)',
  }).optional(),
  taskId: z.string({
    description: 'Task ID (required for start, complete, fail, get)',
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    description: 'Task priority (optional for create)',
  }).optional(),
  error: z.string({
    description: 'Error message (optional for fail)',
  }).optional(),
});

type TaskToolInput = z.infer<typeof TaskToolInputSchema>;

/**
 * Task Tool
 * BEGINNER NOTE: This tool lets the agent manage its own task list
 */
export class TaskTool extends BaseTool {
  readonly name = 'task_manager';

  readonly description =
    'Manages tasks to track work progress. Operations: ' +
    'create (make a new task), start (begin working on task), ' +
    'complete (mark task done), fail (mark task failed), ' +
    'list (show all tasks), get (get task details). ' +
    'Use this to break complex work into steps and track progress.';

  readonly inputSchema = TaskToolInputSchema;

  /**
   * Reference to the task tracker
   */
  private taskTracker: TaskTracker;

  constructor(taskTracker: TaskTracker) {
    super();
    this.taskTracker = taskTracker;
  }

  /**
   * Execute the task operation
   */
  async execute(
    input: unknown,
    _options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    const { operation, description, taskId, priority, error } = input as TaskToolInput;

    try {
      switch (operation) {
        case 'create':
          return await this.createTask(description, priority);

        case 'start':
          return await this.startTask(taskId);

        case 'complete':
          return await this.completeTask(taskId);

        case 'fail':
          return await this.failTask(taskId, error);

        case 'list':
          return this.listTasks();

        case 'get':
          return this.getTask(taskId);

        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Create a new task
   */
  private async createTask(
    description?: string,
    priority?: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<ToolResult> {
    if (!description) {
      return {
        success: false,
        error: 'Description is required to create a task',
      };
    }

    const task = await this.taskTracker.createTask({
      description,
      priority: priority || 'medium',
    });

    return {
      success: true,
      data: {
        message: 'Task created successfully',
        taskId: task.id,
        description: task.description,
        status: task.status,
        priority: task.priority,
      },
    };
  }

  /**
   * Start a task (mark as in-progress)
   */
  private async startTask(taskId?: string): Promise<ToolResult> {
    if (!taskId) {
      return {
        success: false,
        error: 'Task ID is required to start a task',
      };
    }

    const task = await this.taskTracker.startTask(taskId);

    return {
      success: true,
      data: {
        message: 'Task started',
        taskId: task.id,
        description: task.description,
        status: task.status,
      },
    };
  }

  /**
   * Complete a task
   */
  private async completeTask(taskId?: string): Promise<ToolResult> {
    if (!taskId) {
      return {
        success: false,
        error: 'Task ID is required to complete a task',
      };
    }

    const task = await this.taskTracker.completeTask(taskId);

    return {
      success: true,
      data: {
        message: 'Task completed',
        taskId: task.id,
        description: task.description,
        status: task.status,
      },
    };
  }

  /**
   * Fail a task
   */
  private async failTask(taskId?: string, error?: string): Promise<ToolResult> {
    if (!taskId) {
      return {
        success: false,
        error: 'Task ID is required to fail a task',
      };
    }

    const task = await this.taskTracker.failTask(taskId, error);

    return {
      success: true,
      data: {
        message: 'Task marked as failed',
        taskId: task.id,
        description: task.description,
        status: task.status,
        error: error,
      },
    };
  }

  /**
   * List all tasks
   */
  private listTasks(): ToolResult {
    const tasks = this.taskTracker.getAllTasks();
    const stats = this.taskTracker.getStatistics();

    const taskSummaries = tasks.map(task => ({
      id: task.id.substring(0, 8),
      description: task.description,
      status: task.status,
      priority: task.priority,
    }));

    return {
      success: true,
      data: {
        tasks: taskSummaries,
        total: stats.total,
        pending: stats.byStatus.pending,
        inProgress: stats.byStatus['in-progress'],
        completed: stats.byStatus.completed,
        failed: stats.byStatus.failed,
      },
    };
  }

  /**
   * Get details of a specific task
   */
  private getTask(taskId?: string): ToolResult {
    if (!taskId) {
      return {
        success: false,
        error: 'Task ID is required',
      };
    }

    const task = this.taskTracker.getTask(taskId);

    if (!task) {
      // Try partial match
      const allTasks = this.taskTracker.getAllTasks();
      const matches = allTasks.filter(t =>
        t.id.toLowerCase().startsWith(taskId.toLowerCase())
      );

      if (matches.length === 1) {
        const matched = matches[0];
        return {
          success: true,
          data: {
            id: matched.id,
            description: matched.description,
            status: matched.status,
            priority: matched.priority,
            createdAt: matched.createdAt.toISOString(),
            startedAt: matched.startedAt?.toISOString(),
            completedAt: matched.completedAt?.toISOString(),
          },
        };
      }

      return {
        success: false,
        error: `Task not found: ${taskId}`,
      };
    }

    return {
      success: true,
      data: {
        id: task.id,
        description: task.description,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt.toISOString(),
        startedAt: task.startedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
      },
    };
  }
}

/**
 * Factory function to create a TaskTool
 * @param taskTracker - The TaskTracker instance to use
 */
export function createTaskTool(taskTracker: TaskTracker): TaskTool {
  return new TaskTool(taskTracker);
}
