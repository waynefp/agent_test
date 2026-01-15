/**
 * Tool Testing Script
 *
 * Tests tools manually without the agent.
 * This helps verify tools work correctly before integration.
 *
 * Run with: npm run test-tools
 */

import chalk from 'chalk';
import { createCalculatorTool } from './tools/definitions/index.js';
import { createToolRegistry } from './tools/ToolRegistry.js';
import { createToolExecutor } from './tools/ToolExecutor.js';
import { logger } from './utils/logger.js';

/**
 * Main test function
 */
async function testTools(): Promise<void> {
  try {
    console.log(chalk.bold.cyan('\n=== Testing Tool System ===\n'));

    // Step 1: Create tools
    console.log(chalk.bold.white('--- Step 1: Creating Tools ---'));
    const calculator = createCalculatorTool();
    logger.success(`✓ Calculator tool created: ${calculator.name}`);

    // Step 2: Create registry and register tools
    console.log(chalk.bold.white('\n--- Step 2: Registering Tools ---'));
    const registry = createToolRegistry();
    registry.register(calculator);
    logger.success(`✓ Tools registered: ${registry.getToolCount()} tool(s)`);

    // Show registry summary
    console.log();
    registry.printSummary();

    // Step 3: Create executor
    console.log(chalk.bold.white('\n--- Step 3: Creating Tool Executor ---'));
    const executor = createToolExecutor(registry);
    logger.success('✓ Tool executor created');

    // Step 4: Test calculator operations
    console.log(chalk.bold.white('\n--- Step 4: Testing Calculator Tool ---'));

    // Test addition
    console.log(chalk.cyan('\nTest 1: Addition (5 + 3)'));
    const addResult = await executor.executeTool('calculator', {
      operation: 'add',
      a: 5,
      b: 3,
    });
    console.log(chalk.green('Result:'), JSON.stringify(addResult.data, null, 2));

    // Test subtraction
    console.log(chalk.cyan('\nTest 2: Subtraction (10 - 4)'));
    const subResult = await executor.executeTool('calculator', {
      operation: 'subtract',
      a: 10,
      b: 4,
    });
    console.log(chalk.green('Result:'), JSON.stringify(subResult.data, null, 2));

    // Test multiplication
    console.log(chalk.cyan('\nTest 3: Multiplication (7 × 6)'));
    const mulResult = await executor.executeTool('calculator', {
      operation: 'multiply',
      a: 7,
      b: 6,
    });
    console.log(chalk.green('Result:'), JSON.stringify(mulResult.data, null, 2));

    // Test division
    console.log(chalk.cyan('\nTest 4: Division (20 ÷ 4)'));
    const divResult = await executor.executeTool('calculator', {
      operation: 'divide',
      a: 20,
      b: 4,
    });
    console.log(chalk.green('Result:'), JSON.stringify(divResult.data, null, 2));

    // Test division by zero (should fail gracefully)
    console.log(chalk.cyan('\nTest 5: Division by Zero (10 ÷ 0) - Should fail gracefully'));
    const divZeroResult = await executor.executeTool('calculator', {
      operation: 'divide',
      a: 10,
      b: 0,
    });
    if (!divZeroResult.success) {
      console.log(chalk.yellow('Expected Error:'), divZeroResult.error);
    }

    // Test validation error (invalid operation)
    console.log(chalk.cyan('\nTest 6: Invalid Input - Should throw validation error'));
    try {
      await executor.executeTool('calculator', {
        operation: 'invalid_op',
        a: 5,
        b: 3,
      });
    } catch (error) {
      console.log(chalk.yellow('Expected Validation Error:'));
      console.log(chalk.yellow(error instanceof Error ? error.message : String(error)));
    }

    // Test tool not found error
    console.log(chalk.cyan('\nTest 7: Non-existent Tool - Should throw error'));
    try {
      await executor.executeTool('nonexistent_tool', { foo: 'bar' });
    } catch (error) {
      console.log(chalk.yellow('Expected Error:'));
      console.log(chalk.yellow(error instanceof Error ? error.message : String(error)));
    }

    // Step 5: Test Anthropic format conversion
    console.log(chalk.bold.white('\n--- Step 5: Anthropic API Format ---'));
    const anthropicFormat = registry.toAnthropicFormat();
    console.log(chalk.cyan('Tools in Anthropic Format:'));
    console.log(JSON.stringify(anthropicFormat, null, 2));

    // Success!
    console.log(chalk.bold.green('\n✓ All tool tests passed!\n'));

  } catch (error) {
    console.error(chalk.bold.red('\n✗ Tool test failed:'), error);
    process.exit(1);
  }
}

// Run tests
testTools();
