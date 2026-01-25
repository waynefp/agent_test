/**
 * Tool Testing Script
 *
 * Tests all tools to verify they work correctly.
 * Run with: npm run test-tools
 */

import chalk from 'chalk';
import { createCalculatorTool, createFileSystemTool, createTaskTool } from './tools/definitions/index.js';
import { createToolRegistry } from './tools/ToolRegistry.js';
import { createToolExecutor } from './tools/ToolExecutor.js';
import { createTaskTracker } from './agent/TaskTracker.js';

/**
 * Main test function
 */
async function testTools(): Promise<void> {
  let testsPassed = 0;
  let testsFailed = 0;

  const pass = (msg: string) => {
    testsPassed++;
    console.log(chalk.green(`  ✓ ${msg}`));
  };

  const fail = (msg: string, error?: unknown) => {
    testsFailed++;
    console.log(chalk.red(`  ✗ ${msg}`));
    if (error) console.log(chalk.red(`    Error: ${error}`));
  };

  try {
    console.log(chalk.bold.cyan('\n════════════════════════════════════════'));
    console.log(chalk.bold.cyan('       TOOL SYSTEM TEST SUITE'));
    console.log(chalk.bold.cyan('════════════════════════════════════════\n'));

    // ═══════════════════════════════════════════════════════════
    // SETUP
    // ═══════════════════════════════════════════════════════════
    console.log(chalk.bold.white('📦 Setup\n'));

    // Create task tracker (needed for TaskTool)
    const taskTracker = createTaskTracker();

    // Create all tools
    const calculator = createCalculatorTool();
    const fileSystem = createFileSystemTool('./workspace');
    const taskTool = createTaskTool(taskTracker);

    // Create registry and register tools
    const registry = createToolRegistry();
    registry.register(calculator);
    registry.register(fileSystem);
    registry.register(taskTool);

    // Create executor
    const executor = createToolExecutor(registry);

    console.log(chalk.gray(`  Registered ${registry.getToolCount()} tools: ${registry.getToolNames().join(', ')}\n`));

    // ═══════════════════════════════════════════════════════════
    // TEST 1: CALCULATOR TOOL
    // ═══════════════════════════════════════════════════════════
    console.log(chalk.bold.yellow('🔢 Test 1: Calculator Tool\n'));

    // Addition
    const addResult = await executor.executeTool('calculator', { operation: 'add', a: 15, b: 27 });
    if (addResult.success && (addResult.data as any).result === 42) {
      pass('Addition: 15 + 27 = 42');
    } else {
      fail('Addition failed', addResult.error);
    }

    // Multiplication
    const mulResult = await executor.executeTool('calculator', { operation: 'multiply', a: 7, b: 8 });
    if (mulResult.success && (mulResult.data as any).result === 56) {
      pass('Multiplication: 7 × 8 = 56');
    } else {
      fail('Multiplication failed', mulResult.error);
    }

    // Division
    const divResult = await executor.executeTool('calculator', { operation: 'divide', a: 100, b: 4 });
    if (divResult.success && (divResult.data as any).result === 25) {
      pass('Division: 100 ÷ 4 = 25');
    } else {
      fail('Division failed', divResult.error);
    }

    // Division by zero (should fail gracefully)
    const divZeroResult = await executor.executeTool('calculator', { operation: 'divide', a: 10, b: 0 });
    if (!divZeroResult.success && divZeroResult.error?.includes('zero')) {
      pass('Division by zero handled correctly');
    } else {
      fail('Division by zero should return error');
    }

    console.log();

    // ═══════════════════════════════════════════════════════════
    // TEST 2: FILE SYSTEM TOOL
    // ═══════════════════════════════════════════════════════════
    console.log(chalk.bold.yellow('📁 Test 2: FileSystem Tool\n'));

    // Write a file
    const writeResult = await executor.executeTool('file_system', {
      operation: 'write',
      path: 'test-file.txt',
      content: 'Hello from the test suite!\nThis file was created by the FileSystem tool.',
    });
    if (writeResult.success) {
      pass('Write file: test-file.txt created');
    } else {
      fail('Write file failed', writeResult.error);
    }

    // Check if file exists
    const existsResult = await executor.executeTool('file_system', {
      operation: 'exists',
      path: 'test-file.txt',
    });
    if (existsResult.success && (existsResult.data as any).exists === true) {
      pass('File exists check: test-file.txt found');
    } else {
      fail('File exists check failed', existsResult.error);
    }

    // Read the file back
    const readResult = await executor.executeTool('file_system', {
      operation: 'read',
      path: 'test-file.txt',
    });
    if (readResult.success && (readResult.data as any).content?.includes('Hello from the test suite')) {
      pass('Read file: content matches');
    } else {
      fail('Read file failed', readResult.error);
    }

    // List directory
    const listResult = await executor.executeTool('file_system', {
      operation: 'list',
      path: '.',
    });
    if (listResult.success && Array.isArray((listResult.data as any).items)) {
      pass(`List directory: found ${(listResult.data as any).items.length} item(s)`);
    } else {
      fail('List directory failed', listResult.error);
    }

    // Security: Try to escape sandbox (should fail)
    const escapeResult = await executor.executeTool('file_system', {
      operation: 'read',
      path: '../package.json',
    });
    if (!escapeResult.success && escapeResult.error?.includes('Access denied')) {
      pass('Security: sandbox escape blocked');
    } else {
      fail('Security: sandbox escape should be blocked');
    }

    console.log();

    // ═══════════════════════════════════════════════════════════
    // TEST 3: TASK TOOL
    // ═══════════════════════════════════════════════════════════
    console.log(chalk.bold.yellow('📋 Test 3: Task Tool\n'));

    // Create a task
    const createResult = await executor.executeTool('task_manager', {
      operation: 'create',
      title: 'Test Task from Tool Suite',
      description: 'This task was created during automated testing',
    });
    let taskId: string = '';
    if (createResult.success && (createResult.data as any).taskId) {
      taskId = (createResult.data as any).taskId;
      pass(`Create task: ID ${taskId.substring(0, 8)}...`);
    } else {
      fail('Create task failed', createResult.error);
    }

    // List tasks
    const listTasksResult = await executor.executeTool('task_manager', {
      operation: 'list',
    });
    if (listTasksResult.success && Array.isArray((listTasksResult.data as any).tasks)) {
      const count = (listTasksResult.data as any).tasks.length;
      pass(`List tasks: ${count} task(s) found`);
    } else {
      fail('List tasks failed', listTasksResult.error);
    }

    // Start the task
    if (taskId) {
      const startResult = await executor.executeTool('task_manager', {
        operation: 'start',
        taskId: taskId,
      });
      if (startResult.success && (startResult.data as any).status === 'in-progress') {
        pass('Start task: status changed to in-progress');
      } else {
        fail('Start task failed', startResult.error);
      }

      // Complete the task
      const completeResult = await executor.executeTool('task_manager', {
        operation: 'complete',
        taskId: taskId,
      });
      if (completeResult.success && (completeResult.data as any).status === 'completed') {
        pass('Complete task: status changed to completed');
      } else {
        fail('Complete task failed', completeResult.error);
      }

      // Get task details
      const getResult = await executor.executeTool('task_manager', {
        operation: 'get',
        taskId: taskId,
      });
      if (getResult.success && (getResult.data as any).completedAt) {
        pass('Get task: completedAt timestamp present');
      } else {
        fail('Get task failed', getResult.error);
      }
    }

    console.log();

    // ═══════════════════════════════════════════════════════════
    // TEST 4: ANTHROPIC FORMAT
    // ═══════════════════════════════════════════════════════════
    console.log(chalk.bold.yellow('🔌 Test 4: Anthropic API Format\n'));

    const anthropicFormat = registry.toAnthropicFormat();
    if (anthropicFormat.length === 3) {
      pass('Converted 3 tools to Anthropic format');

      // Check each tool has required fields
      let allValid = true;
      for (const tool of anthropicFormat) {
        if (!tool.name || !tool.description || !tool.input_schema) {
          allValid = false;
          break;
        }
      }
      if (allValid) {
        pass('All tools have name, description, and input_schema');
      } else {
        fail('Some tools missing required fields');
      }
    } else {
      fail(`Expected 3 tools, got ${anthropicFormat.length}`);
    }

    console.log();

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log(chalk.bold.cyan('════════════════════════════════════════'));
    console.log(chalk.bold.cyan('                RESULTS'));
    console.log(chalk.bold.cyan('════════════════════════════════════════\n'));

    console.log(chalk.green(`  Passed: ${testsPassed}`));
    console.log(chalk.red(`  Failed: ${testsFailed}`));
    console.log();

    if (testsFailed === 0) {
      console.log(chalk.bold.green('✓ All tests passed! Tools are ready.\n'));
    } else {
      console.log(chalk.bold.red(`✗ ${testsFailed} test(s) failed. Please review.\n`));
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.bold.red('\n✗ Test suite crashed:'), error);
    process.exit(1);
  }
}

// Run tests
testTools();
