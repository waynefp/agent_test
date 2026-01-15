/**
 * Task Type Definitions
 *
 * These types define the structure for tracking tasks and subtasks.
 * This aligns with your vision of tracking what the agent is working on.
 *
 * BEGINNER NOTE: Tasks help you see what the agent is doing and track progress.
 * They can be hierarchical (tasks can have subtasks).
 */

/**
 * Status of a task
 * BEGINNER NOTE: A task goes through these states as it's worked on
 */
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

/**
 * Priority level for a task
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * A task that the agent is working on
 * BEGINNER NOTE: This represents a single unit of work
 */
export interface Task {
  /** Unique identifier */
  id: string;

  /** Human-readable description */
  description: string;

  /** Current status */
  status: TaskStatus;

  /** Priority level */
  priority: TaskPriority;

  /** ID of parent task (if this is a subtask) */
  parentId?: string;

  /** Array of subtask IDs */
  subtaskIds: string[];

  /** When the task was created */
  createdAt: Date;

  /** When the task was started (moved to in-progress) */
  startedAt?: Date;

  /** When the task was completed or failed */
  completedAt?: Date;

  /** Optional metadata */
  metadata?: TaskMetadata;
}

/**
 * Metadata about a task
 */
export interface TaskMetadata {
  /** Tools used while working on this task */
  toolsUsed?: string[];

  /** Number of messages exchanged while working on this task */
  messageCount?: number;

  /** Error message (if task failed) */
  error?: string;

  /** Estimated completion time (in seconds) */
  estimatedTime?: number;

  /** Actual time taken (in seconds) */
  actualTime?: number;

  /** Tags for categorizing tasks */
  tags?: string[];

  /** Any additional metadata */
  [key: string]: unknown;
}

/**
 * A hierarchical tree of tasks
 * BEGINNER NOTE: This represents all tasks with their parent-child relationships
 */
export interface TaskTree {
  /** Root tasks (tasks with no parent) */
  roots: TaskNode[];

  /** Flat map of all tasks by ID (for quick lookup) */
  tasks: Map<string, Task>;
}

/**
 * A node in the task tree
 * BEGINNER NOTE: This wraps a task and includes its subtasks as child nodes
 */
export interface TaskNode {
  /** The task data */
  task: Task;

  /** Child task nodes (subtasks) */
  children: TaskNode[];

  /** Depth in the tree (0 for root tasks) */
  depth: number;
}

/**
 * Options for creating a new task
 */
export interface CreateTaskOptions {
  /** Task description */
  description: string;

  /** Priority (defaults to 'medium') */
  priority?: TaskPriority;

  /** Parent task ID (if this is a subtask) */
  parentId?: string;

  /** Initial metadata */
  metadata?: Partial<TaskMetadata>;
}

/**
 * Options for updating a task
 */
export interface UpdateTaskOptions {
  /** New status */
  status?: TaskStatus;

  /** New description */
  description?: string;

  /** New priority */
  priority?: TaskPriority;

  /** Metadata to merge (will be shallow merged with existing) */
  metadata?: Partial<TaskMetadata>;
}

/**
 * Summary statistics about tasks
 * BEGINNER NOTE: Useful for showing progress and metrics
 */
export interface TaskStatistics {
  /** Total number of tasks */
  total: number;

  /** Number of tasks by status */
  byStatus: {
    pending: number;
    'in-progress': number;
    completed: number;
    failed: number;
  };

  /** Number of tasks by priority */
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };

  /** Average completion time (in seconds) */
  averageCompletionTime?: number;

  /** Success rate (completed / (completed + failed)) */
  successRate?: number;
}

/**
 * Helper function to check if a task is active
 * BEGINNER NOTE: Active means not completed or failed
 */
export function isTaskActive(task: Task): boolean {
  return task.status === 'pending' || task.status === 'in-progress';
}

/**
 * Helper function to check if a task is complete
 */
export function isTaskComplete(task: Task): boolean {
  return task.status === 'completed';
}

/**
 * Helper function to check if a task failed
 */
export function isTaskFailed(task: Task): boolean {
  return task.status === 'failed';
}

/**
 * Helper function to calculate task duration
 * BEGINNER NOTE: Returns how long the task took in seconds, or undefined if not complete
 */
export function getTaskDuration(task: Task): number | undefined {
  if (!task.startedAt || !task.completedAt) {
    return undefined;
  }

  return (task.completedAt.getTime() - task.startedAt.getTime()) / 1000;
}

/**
 * Helper function to check if a task has subtasks
 */
export function hasSubtasks(task: Task): boolean {
  return task.subtaskIds.length > 0;
}

/**
 * Helper function to check if a task is a root task
 * BEGINNER NOTE: Root tasks have no parent
 */
export function isRootTask(task: Task): boolean {
  return task.parentId === undefined;
}

/**
 * Error thrown when a task operation fails
 */
export class TaskError extends Error {
  constructor(
    message: string,
    public taskId?: string
  ) {
    super(message);
    this.name = 'TaskError';
  }
}

/**
 * Error thrown when a task is not found
 */
export class TaskNotFoundError extends TaskError {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`, taskId);
    this.name = 'TaskNotFoundError';
  }
}
