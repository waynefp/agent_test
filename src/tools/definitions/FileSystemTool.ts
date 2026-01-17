/**
 * File System Tool
 *
 * Allows the agent to read, write, and list files.
 * This gives the agent the ability to interact with the file system!
 *
 * BEGINNER NOTE: This is a powerful tool - the agent can now
 * read your files and create new ones. We add safety measures
 * to restrict access to a specific workspace directory.
 */

import { z } from 'zod';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';

/**
 * Input schema for the file system tool
 * BEGINNER NOTE: The agent can perform different operations on files
 */
const FileSystemInputSchema = z.object({
  operation: z.enum(['read', 'write', 'list', 'exists'], {
    description: 'The file operation to perform',
  }),
  path: z.string({
    description: 'The file or directory path (relative to workspace)',
  }),
  content: z.string({
    description: 'Content to write (only for write operation)',
  }).optional(),
});

type FileSystemInput = z.infer<typeof FileSystemInputSchema>;

/**
 * File System Tool
 * BEGINNER NOTE: This tool lets the agent read, write, and explore files
 */
export class FileSystemTool extends BaseTool {
  readonly name = 'file_system';

  readonly description =
    'Performs file system operations: read files, write files, list directory contents, or check if a file exists. ' +
    'Use this tool when you need to read or create files, or explore what files are available.';

  readonly inputSchema = FileSystemInputSchema;

  /**
   * The workspace directory - all file operations are relative to this
   * BEGINNER NOTE: This is a safety measure to prevent accessing files outside the workspace
   */
  private workspaceDir: string;

  constructor(workspaceDir: string = './workspace') {
    super();
    this.workspaceDir = resolve(workspaceDir);

    // Ensure workspace directory exists
    if (!existsSync(this.workspaceDir)) {
      mkdirSync(this.workspaceDir, { recursive: true });
    }
  }

  /**
   * Execute the file operation
   */
  async execute(
    input: unknown,
    _options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    const { operation, path, content } = input as FileSystemInput;

    try {
      // Resolve the full path and validate it's within workspace
      const fullPath = this.resolveSafePath(path);
      if (!fullPath) {
        return {
          success: false,
          error: `Access denied: Path must be within the workspace directory`,
        };
      }

      switch (operation) {
        case 'read':
          return this.readFile(fullPath);

        case 'write':
          if (content === undefined) {
            return {
              success: false,
              error: 'Content is required for write operation',
            };
          }
          return this.writeFile(fullPath, content);

        case 'list':
          return this.listDirectory(fullPath);

        case 'exists':
          return this.checkExists(fullPath);

        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Resolve a path safely within the workspace
   * BEGINNER NOTE: This prevents "path traversal" attacks where someone
   * tries to access files outside the allowed directory using ../
   */
  private resolveSafePath(relativePath: string): string | null {
    const fullPath = resolve(this.workspaceDir, relativePath);

    // Check if the resolved path is still within the workspace
    if (!fullPath.startsWith(this.workspaceDir)) {
      return null;
    }

    return fullPath;
  }

  /**
   * Read a file and return its contents
   */
  private readFile(filePath: string): ToolResult {
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `File not found: ${basename(filePath)}`,
      };
    }

    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      return {
        success: false,
        error: `Cannot read a directory. Use 'list' operation instead.`,
      };
    }

    // Check file size (limit to 100KB for safety)
    if (stats.size > 100 * 1024) {
      return {
        success: false,
        error: `File too large (${Math.round(stats.size / 1024)}KB). Maximum size is 100KB.`,
      };
    }

    const content = readFileSync(filePath, 'utf-8');

    return {
      success: true,
      data: {
        path: basename(filePath),
        content,
        size: stats.size,
        extension: extname(filePath),
      },
    };
  }

  /**
   * Write content to a file
   */
  private writeFile(filePath: string, content: string): ToolResult {
    // Ensure parent directory exists
    const parentDir = resolve(filePath, '..');
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    writeFileSync(filePath, content, 'utf-8');

    return {
      success: true,
      data: {
        path: basename(filePath),
        message: `File written successfully`,
        size: content.length,
      },
    };
  }

  /**
   * List contents of a directory
   */
  private listDirectory(dirPath: string): ToolResult {
    if (!existsSync(dirPath)) {
      return {
        success: false,
        error: `Directory not found: ${basename(dirPath)}`,
      };
    }

    const stats = statSync(dirPath);
    if (!stats.isDirectory()) {
      return {
        success: false,
        error: `Not a directory. Use 'read' operation for files.`,
      };
    }

    const entries = readdirSync(dirPath, { withFileTypes: true });
    const items = entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
      extension: entry.isFile() ? extname(entry.name) : null,
    }));

    return {
      success: true,
      data: {
        path: basename(dirPath) || 'workspace',
        items,
        count: items.length,
      },
    };
  }

  /**
   * Check if a file or directory exists
   */
  private checkExists(filePath: string): ToolResult {
    const exists = existsSync(filePath);

    let type: string | null = null;
    if (exists) {
      const stats = statSync(filePath);
      type = stats.isDirectory() ? 'directory' : 'file';
    }

    return {
      success: true,
      data: {
        path: basename(filePath),
        exists,
        type,
      },
    };
  }

  /**
   * Get the workspace directory path
   */
  getWorkspaceDir(): string {
    return this.workspaceDir;
  }
}

/**
 * Factory function to create a FileSystemTool
 * @param workspaceDir - The workspace directory (defaults to ./workspace)
 */
export function createFileSystemTool(workspaceDir?: string): FileSystemTool {
  return new FileSystemTool(workspaceDir);
}
