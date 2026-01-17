/**
 * Task Tracker
 *
 * Manages tasks and subtasks for tracking what the agent is working on.
 * Supports hierarchical task structures with persistence.
 *
 * BEGINNER NOTE: This is like a to-do list manager for the agent.
 * Tasks can have subtasks (nested to-dos), and everything is saved
 * to disk so you don't lose your progress.
 */

import { randomUUID } from 'crypto';
import type {
  Task,
  TaskStatus,
  TaskStatistics,
  TaskTree,
  TaskNode,
  CreateTaskOptions,
  UpdateTaskOptions,
} from '../types/task.types.js';
import {
  TaskNotFoundError,
  isTaskActive,
  isTaskComplete,
  getTaskDuration,
} from '../types/task.types.js';
import { logger } from '../utils/logger.js';

/**
 * TaskTracker class
 * BEGINNER NOTE: This manages all your tasks in memory and can save them to disk
 */
export class TaskTracker {
  /**
   * Internal storage for tasks
   * BEGINNER NOTE: Map provides O(1) lookup by task ID
   */
  private tasks: Map<string, Task>;

  /**
   * Optional persistence handler
   * BEGINNER NOTE: If provided, tasks will be auto-saved to disk
   */
  private persistence?: {
    save: (tasks: Map<string, Task>) => Promise<void>;
    load: () => Promise<Map<string, Task>>;
  };

  /**
   * Create a new TaskTracker
   * @param persistence - Optional persistence handler for saving/loading tasks
   */
  constructor(persistence?: {
    save: (tasks: Map<string, Task>) => Promise<void>;
    load: () => Promise<Map<string, Task>>;
  }) {
    this.tasks = new Map();
    this.persistence = persistence;
    logger.info('TaskTracker initialized');
  }

  /**
   * Initialize the tracker by loading existing tasks
   * BEGINNER NOTE: Call this after creating the tracker to load saved tasks
   */
  async initialize(): Promise<void> {
    if (this.persistence) {
      try {
        this.tasks = await this.persistence.load();
        logger.info(`Loaded ${this.tasks.size} task(s) from storage`);
      } catch (error) {
        logger.warn('No existing tasks found, starting fresh');
        this.tasks = new Map();
      }
    }
  }

  /**
   * Create a new task
   * BEGINNER NOTE: This is how you add a new task to track
   *
   * @param options - Task creation options
   * @returns The created task
   */
  async createTask(options: CreateTaskOptions): Promise<Task> {
    const id = randomUUID();
    const now = new Date();

    const task: Task = {
      id,
      description: options.description,
      status: 'pending',
      priority: options.priority || 'medium',
      parentId: options.parentId,
      subtaskIds: [],
      createdAt: now,
      metadata: options.metadata,
    };

    // Add to storage
    this.tasks.set(id, task);

    // If this is a subtask, update the parent
    if (options.parentId) {
      const parent = this.tasks.get(options.parentId);
      if (parent) {
        parent.subtaskIds.push(id);
      } else {
        logger.warn(`Parent task ${options.parentId} not found`);
      }
    }

    // Persist
    await this.save();

    logger.task(id, 'created', options.description);
    return task;
  }

  /**
   * Get a task by ID
   * @param id - Task ID
   * @returns The task, or undefined if not found
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get a task by ID, throwing if not found
   * @param id - Task ID
   * @returns The task
   * @throws TaskNotFoundError if task doesn't exist
   */
  getTaskOrThrow(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new TaskNotFoundError(id);
    }
    return task;
  }

  /**
   * Update a task
   * BEGINNER NOTE: Use this to change task status, description, or priority
   *
   * @param id - Task ID
   * @param options - Update options
   * @returns The updated task
   * @throws TaskNotFoundError if task doesn't exist
   */
  async updateTask(id: string, options: UpdateTaskOptions): Promise<Task> {
    const task = this.getTaskOrThrow(id);
    const previousStatus = task.status;

    // Update fields
    if (options.status !== undefined) {
      task.status = options.status;

      // Handle status change timestamps
      if (options.status === 'in-progress' && !task.startedAt) {
        task.startedAt = new Date();
      } else if (
        (options.status === 'completed' || options.status === 'failed') &&
        !task.completedAt
      ) {
        task.completedAt = new Date();
      }
    }

    if (options.description !== undefined) {
      task.description = options.description;
    }

    if (options.priority !== undefined) {
      task.priority = options.priority;
    }

    if (options.metadata !== undefined) {
      task.metadata = { ...task.metadata, ...options.metadata };
    }

    // Persist
    await this.save();

    logger.task(id, options.status || previousStatus, task.description);
    return task;
  }

  /**
   * Mark a task as in-progress
   * @param id - Task ID
   */
  async startTask(id: string): Promise<Task> {
    return this.updateTask(id, { status: 'in-progress' });
  }

  /**
   * Mark a task as completed
   * @param id - Task ID
   */
  async completeTask(id: string): Promise<Task> {
    return this.updateTask(id, { status: 'completed' });
  }

  /**
   * Mark a task as failed
   * @param id - Task ID
   * @param error - Optional error message
   */
  async failTask(id: string, error?: string): Promise<Task> {
    return this.updateTask(id, {
      status: 'failed',
      metadata: error ? { error } : undefined,
    });
  }

  /**
   * Delete a task
   * BEGINNER NOTE: This removes the task and all its subtasks
   *
   * @param id - Task ID
   * @returns true if deleted, false if not found
   */
  async deleteTask(id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) {
      return false;
    }

    // Delete all subtasks recursively
    for (const subtaskId of task.subtaskIds) {
      await this.deleteTask(subtaskId);
    }

    // Remove from parent's subtaskIds
    if (task.parentId) {
      const parent = this.tasks.get(task.parentId);
      if (parent) {
        parent.subtaskIds = parent.subtaskIds.filter((sid) => sid !== id);
      }
    }

    // Delete the task
    this.tasks.delete(id);

    // Persist
    await this.save();

    logger.task(id, 'deleted', task.description);
    return true;
  }

  /**
   * Get all tasks
   * @returns Array of all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get root tasks (tasks with no parent)
   * @returns Array of root tasks
   */
  getRootTasks(): Task[] {
    return this.getAllTasks().filter((task) => !task.parentId);
  }

  /**
   * Get tasks by status
   * @param status - Status to filter by
   * @returns Array of matching tasks
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getAllTasks().filter((task) => task.status === status);
  }

  /**
   * Get active tasks (pending or in-progress)
   * @returns Array of active tasks
   */
  getActiveTasks(): Task[] {
    return this.getAllTasks().filter(isTaskActive);
  }

  /**
   * Get subtasks of a task
   * @param parentId - Parent task ID
   * @returns Array of subtasks
   */
  getSubtasks(parentId: string): Task[] {
    const parent = this.tasks.get(parentId);
    if (!parent) {
      return [];
    }
    return parent.subtaskIds
      .map((id) => this.tasks.get(id))
      .filter((task): task is Task => task !== undefined);
  }

  /**
   * Get task count
   * @returns Number of tasks
   */
  getTaskCount(): number {
    return this.tasks.size;
  }

  /**
   * Get task statistics
   * BEGINNER NOTE: Useful for showing progress metrics
   *
   * @returns Statistics about all tasks
   */
  getStatistics(): TaskStatistics {
    const tasks = this.getAllTasks();

    const byStatus = {
      pending: 0,
      'in-progress': 0,
      completed: 0,
      failed: 0,
    };

    const byPriority = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    let totalDuration = 0;
    let completedWithDuration = 0;

    for (const task of tasks) {
      byStatus[task.status]++;
      byPriority[task.priority]++;

      if (isTaskComplete(task)) {
        const duration = getTaskDuration(task);
        if (duration !== undefined) {
          totalDuration += duration;
          completedWithDuration++;
        }
      }
    }

    const completedAndFailed = byStatus.completed + byStatus.failed;
    const successRate =
      completedAndFailed > 0
        ? byStatus.completed / completedAndFailed
        : undefined;

    const averageCompletionTime =
      completedWithDuration > 0
        ? totalDuration / completedWithDuration
        : undefined;

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      successRate,
      averageCompletionTime,
    };
  }

  /**
   * Build a task tree for hierarchical display
   * BEGINNER NOTE: This organizes tasks into a tree structure
   *
   * @returns TaskTree structure
   */
  buildTaskTree(): TaskTree {
    const buildNode = (task: Task, depth: number): TaskNode => {
      const children = this.getSubtasks(task.id).map((subtask) =>
        buildNode(subtask, depth + 1)
      );
      return { task, children, depth };
    };

    const roots = this.getRootTasks().map((task) => buildNode(task, 0));

    return {
      roots,
      tasks: this.tasks,
    };
  }

  /**
   * Clear all tasks
   * BEGINNER NOTE: Use with caution - this deletes everything!
   */
  async clearAllTasks(): Promise<void> {
    this.tasks.clear();
    await this.save();
    logger.info('All tasks cleared');
  }

  /**
   * Save tasks to persistence
   */
  private async save(): Promise<void> {
    if (this.persistence) {
      try {
        await this.persistence.save(this.tasks);
      } catch (error) {
        logger.error('Failed to save tasks:', error);
      }
    }
  }

  /**
   * Get a summary of tasks
   * BEGINNER NOTE: Useful for debugging and logging
   *
   * @returns A string describing task status
   */
  getSummary(): string {
    const stats = this.getStatistics();

    if (stats.total === 0) {
      return 'No tasks';
    }

    const lines = [
      `Tasks (${stats.total} total):`,
      `  Pending: ${stats.byStatus.pending}`,
      `  In Progress: ${stats.byStatus['in-progress']}`,
      `  Completed: ${stats.byStatus.completed}`,
      `  Failed: ${stats.byStatus.failed}`,
    ];

    if (stats.successRate !== undefined) {
      lines.push(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    }

    return lines.join('\n');
  }
}

/**
 * Factory function to create a TaskTracker
 * BEGINNER NOTE: Use this to create a tracker with optional persistence
 *
 * @param persistence - Optional persistence handler
 * @returns A new TaskTracker instance
 */
export function createTaskTracker(persistence?: {
  save: (tasks: Map<string, Task>) => Promise<void>;
  load: () => Promise<Map<string, Task>>;
}): TaskTracker {
  return new TaskTracker(persistence);
}
