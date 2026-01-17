/**
 * Task Persistence
 *
 * Handles saving and loading tasks to/from JSON files.
 *
 * BEGINNER NOTE: This is how tasks survive when you close the app.
 * Tasks are saved as JSON files in the data/tasks/ directory.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { Task } from '../types/task.types.js';
import { logger } from '../utils/logger.js';

/**
 * Interface for the persisted task data
 * BEGINNER NOTE: This is the structure of the JSON file
 */
interface PersistedTaskData {
  /** Version for future migrations */
  version: number;

  /** Tasks as a plain object (Maps can't be JSON serialized directly) */
  tasks: Record<string, PersistedTask>;

  /** Metadata about the save */
  metadata: {
    lastUpdated: string;
    taskCount: number;
  };
}

/**
 * Task with dates as strings (for JSON serialization)
 * BEGINNER NOTE: JSON doesn't support Date objects, so we convert to strings
 */
interface PersistedTask {
  id: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  parentId?: string;
  subtaskIds: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  metadata?: Task['metadata'];
}

/**
 * TaskPersistence class
 * BEGINNER NOTE: Handles all file I/O for tasks
 */
export class TaskPersistence {
  private tasksDir: string;
  private filePath: string;

  /**
   * Create a new TaskPersistence
   * @param dataDir - Base data directory (defaults to ./data)
   */
  constructor(dataDir: string = './data') {
    this.tasksDir = join(dataDir, 'tasks');
    this.filePath = join(this.tasksDir, 'tasks.json');
    this.ensureDirectoriesExist();
  }

  /**
   * Ensure the data directories exist
   * BEGINNER NOTE: Creates directories if they don't exist
   */
  private ensureDirectoriesExist(): void {
    if (!existsSync(this.tasksDir)) {
      mkdirSync(this.tasksDir, { recursive: true });
      logger.info(`Created tasks directory: ${this.tasksDir}`);
    }
  }

  /**
   * Save tasks to disk
   * BEGINNER NOTE: Converts Map to plain object and writes to JSON file
   *
   * @param tasks - Map of tasks to save
   */
  async save(tasks: Map<string, Task>): Promise<void> {
    // Convert tasks to serializable format
    const persistedTasks: Record<string, PersistedTask> = {};

    for (const [id, task] of tasks) {
      persistedTasks[id] = this.taskToPersistedTask(task);
    }

    const data: PersistedTaskData = {
      version: 1,
      tasks: persistedTasks,
      metadata: {
        lastUpdated: new Date().toISOString(),
        taskCount: tasks.size,
      },
    };

    // Write to file
    try {
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug(`Saved ${tasks.size} task(s) to ${this.filePath}`);
    } catch (error) {
      logger.error('Failed to save tasks:', error);
      throw error;
    }
  }

  /**
   * Load tasks from disk
   * BEGINNER NOTE: Reads JSON file and converts back to Map of Tasks
   *
   * @returns Map of tasks
   */
  async load(): Promise<Map<string, Task>> {
    if (!existsSync(this.filePath)) {
      logger.debug('No tasks file found, returning empty map');
      return new Map();
    }

    try {
      const content = readFileSync(this.filePath, 'utf-8');
      const data: PersistedTaskData = JSON.parse(content);

      // Validate version
      if (data.version !== 1) {
        logger.warn(`Unknown tasks file version: ${data.version}`);
      }

      // Convert back to Map with proper Date objects
      const tasks = new Map<string, Task>();

      for (const [id, persistedTask] of Object.entries(data.tasks)) {
        tasks.set(id, this.persistedTaskToTask(persistedTask));
      }

      logger.debug(`Loaded ${tasks.size} task(s) from ${this.filePath}`);
      return tasks;
    } catch (error) {
      logger.error('Failed to load tasks:', error);
      throw error;
    }
  }

  /**
   * Convert a Task to PersistedTask (for JSON serialization)
   * BEGINNER NOTE: Converts Date objects to ISO strings
   */
  private taskToPersistedTask(task: Task): PersistedTask {
    return {
      id: task.id,
      description: task.description,
      status: task.status,
      priority: task.priority,
      parentId: task.parentId,
      subtaskIds: task.subtaskIds,
      createdAt: task.createdAt.toISOString(),
      startedAt: task.startedAt?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      metadata: task.metadata,
    };
  }

  /**
   * Convert a PersistedTask back to Task
   * BEGINNER NOTE: Converts ISO strings back to Date objects
   */
  private persistedTaskToTask(persisted: PersistedTask): Task {
    return {
      id: persisted.id,
      description: persisted.description,
      status: persisted.status,
      priority: persisted.priority,
      parentId: persisted.parentId,
      subtaskIds: persisted.subtaskIds,
      createdAt: new Date(persisted.createdAt),
      startedAt: persisted.startedAt ? new Date(persisted.startedAt) : undefined,
      completedAt: persisted.completedAt ? new Date(persisted.completedAt) : undefined,
      metadata: persisted.metadata,
    };
  }

  /**
   * Delete the tasks file
   * BEGINNER NOTE: Use with caution!
   */
  async clear(): Promise<void> {
    if (existsSync(this.filePath)) {
      const { unlinkSync } = await import('fs');
      unlinkSync(this.filePath);
      logger.info('Tasks file deleted');
    }
  }

  /**
   * Check if tasks file exists
   */
  exists(): boolean {
    return existsSync(this.filePath);
  }

  /**
   * Get the file path
   */
  getFilePath(): string {
    return this.filePath;
  }
}

/**
 * Factory function to create a TaskPersistence
 * @param dataDir - Base data directory
 */
export function createTaskPersistence(dataDir?: string): TaskPersistence {
  return new TaskPersistence(dataDir);
}
