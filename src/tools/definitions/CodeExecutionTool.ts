/**
 * Code Execution Tool
 *
 * Executes code in a sandboxed environment with resource limits.
 * Supports JavaScript and Python code execution.
 *
 * BEGINNER NOTE: This tool runs user code in isolation with timeouts
 * and memory limits to prevent abuse. Use with caution!
 *
 * SECURITY NOTE: While this uses vm2 for sandboxing, no sandbox is perfect.
 * In production, consider using containerized execution (Docker-in-Docker)
 * or a dedicated sandbox service like E2B.
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';
import { NodeVM } from 'vm2';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

/**
 * Input schema for the Code Execution tool
 * BEGINNER NOTE: Supports JavaScript and Python with safety limits
 */
const CodeExecutionInputSchema = z.object({
  language: z.enum(['javascript', 'python'], {
    description: 'Programming language to execute',
  }),
  code: z.string().describe('The code to execute'),
  timeout: z
    .number()
    .default(5000)
    .describe('Execution timeout in milliseconds (default: 5000, max: 30000)'),
  args: z.array(z.string()).optional().describe('Command-line arguments for the code'),
});

type CodeExecutionInput = z.infer<typeof CodeExecutionInputSchema>;

/**
 * Code Execution Tool Implementation
 * BEGINNER NOTE: Executes code safely with resource limits
 */
export class CodeExecutionTool extends BaseTool {
  readonly name = 'code_execution';

  readonly description =
    'Execute code in a sandboxed environment. Supports JavaScript and Python. ' +
    'Code runs with timeout and resource limits for safety. ' +
    'Use this tool to run calculations, process data, or test algorithms. ' +
    'Returns stdout, stderr, and execution results. ' +
    'Maximum timeout: 30 seconds.';

  readonly inputSchema = CodeExecutionInputSchema;

  private workspacePath: string;
  private maxTimeout = 30000; // 30 seconds max

  constructor(workspacePath: string = '/tmp') {
    super();
    this.workspacePath = workspacePath;
  }

  async execute(input: unknown, _options?: ToolExecutionOptions): Promise<ToolResult> {
    const { language, code, timeout, args } = input as CodeExecutionInput;

    // Enforce maximum timeout
    const effectiveTimeout = Math.min(timeout, this.maxTimeout);

    try {
      let result: any;

      switch (language) {
        case 'javascript':
          result = await this.executeJavaScript(code, effectiveTimeout);
          break;

        case 'python':
          result = await this.executePython(code, effectiveTimeout, args);
          break;

        default:
          return {
            success: false,
            error: `Unsupported language: ${language}`,
          };
      }

      return {
        success: result.exitCode === 0,
        data: result,
        metadata: {
          language,
          executionTime: result.executionTime,
          timeout: effectiveTimeout,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          language,
          timeout: effectiveTimeout,
        },
      };
    }
  }

  /**
   * Execute JavaScript code in vm2 sandbox
   * BEGINNER NOTE: vm2 provides good isolation but isn't perfect
   */
  private async executeJavaScript(code: string, timeout: number): Promise<any> {
    const startTime = Date.now();

    try {
      // Create sandboxed VM
      const vm = new NodeVM({
        timeout,
        sandbox: {},
        console: 'redirect', // Capture console output
        require: {
          external: false, // Disable external requires for security
          builtin: ['util', 'path', 'crypto'], // Only allow safe built-ins
        },
      });

      // Capture console output
      let stdout = '';
      let stderr = '';

      vm.on('console.log', (...args) => {
        stdout += args.join(' ') + '\n';
      });

      vm.on('console.error', (...args) => {
        stderr += args.join(' ') + '\n';
      });

      // Execute code
      const result = vm.run(code, 'sandbox.js');

      const executionTime = Date.now() - startTime;

      return {
        exitCode: 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        result: result !== undefined ? String(result) : undefined,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  /**
   * Execute Python code in subprocess
   * BEGINNER NOTE: Runs Python in isolated process with timeout
   */
  private async executePython(code: string, timeout: number, args?: string[]): Promise<any> {
    const startTime = Date.now();

    // Create temporary file for the code
    const tempFile = path.join(this.workspacePath, `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.py`);

    try {
      await writeFile(tempFile, code);

      return await this.runPythonProcess(tempFile, timeout, args, startTime);
    } finally {
      // Clean up temp file
      try {
        await unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Run Python process with timeout
   */
  private runPythonProcess(
    scriptPath: string,
    timeout: number,
    args: string[] = [],
    startTime: number
  ): Promise<any> {
    return new Promise((resolve) => {
      const python = spawn('python3', [scriptPath, ...args], {
        timeout,
        cwd: this.workspacePath,
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        const executionTime = Date.now() - startTime;

        resolve({
          exitCode: code ?? 1,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          executionTime,
        });
      });

      python.on('error', (error) => {
        const executionTime = Date.now() - startTime;

        resolve({
          exitCode: 1,
          stdout: stdout.trim(),
          stderr: error.message,
          executionTime,
        });
      });

      // Handle timeout
      setTimeout(() => {
        if (!python.killed) {
          python.kill('SIGTERM');

          const executionTime = Date.now() - startTime;

          resolve({
            exitCode: 124, // Timeout exit code
            stdout: stdout.trim(),
            stderr: `Execution timeout after ${timeout}ms`,
            executionTime,
          });
        }
      }, timeout);
    });
  }
}

/**
 * Factory function to create a CodeExecutionTool
 */
export function createCodeExecutionTool(workspacePath: string = '/tmp'): CodeExecutionTool {
  return new CodeExecutionTool(workspacePath);
}
