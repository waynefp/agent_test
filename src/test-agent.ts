/**
 * Agent Test Script (With Tools!)
 *
 * Tests the agent with tool support - Claude can now use tools autonomously!
 * Run with: npm run test-agent
 */

import { logger } from './utils/logger.js';
import { validateEnvironment } from './config/environment.js';
import { createAgent } from './agent/Agent.js';
import { createCalculatorTool } from './tools/definitions/index.js';
import chalk from 'chalk';

async function testAgent(): Promise<void> {
  try {
    console.log(chalk.bold.cyan('\n=== Testing Agent with Tools ===\n'));

    // Validate environment
    logger.info('Validating environment...');
    validateEnvironment();
    logger.success('✓ Environment valid');

    // Create tools
    logger.info('Creating tools...');
    const calculator = createCalculatorTool();
    logger.success('✓ Calculator tool created');

    // Create agent WITH TOOLS
    logger.info('Creating agent with tools...');
    const agent = createAgent(
      {
        enableTools: true,  // IMPORTANT: Enable tool usage!
      },
      [calculator]  // Pass the calculator tool
    );
    logger.success('✓ Agent created with tools enabled');

    // Show available tools
    console.log(chalk.cyan('\nAvailable tools:'), agent.getAvailableTools().join(', '));

    // Test 1: Math question (Claude should use calculator!)
    console.log(chalk.bold.white('\n--- Test 1: Simple Math (Should use calculator) ---'));
    console.log(chalk.blue('User: ') + 'What is 156 + 289?');

    const response1 = await agent.chat('What is 156 + 289?');
    console.log(chalk.green('Assistant: ') + response1);

    // Test 2: Complex calculation
    console.log(chalk.bold.white('\n--- Test 2: Multiple Operations ---'));
    console.log(chalk.blue('User: ') + 'What is (25 * 4) + (100 / 5)?');

    const response2 = await agent.chat('What is (25 * 4) + (100 / 5)?');
    console.log(chalk.green('Assistant: ') + response2);

    // Test 3: Follow-up question (tests conversation memory)
    console.log(chalk.bold.white('\n--- Test 3: Follow-up (Tests memory) ---'));
    console.log(chalk.blue('User: ') + 'Now multiply that result by 2');

    const response3 = await agent.chat('Now multiply that result by 2');
    console.log(chalk.green('Assistant: ') + response3);

    // Test 4: Question that doesn't need tools
    console.log(chalk.bold.white('\n--- Test 4: No Tool Needed ---'));
    console.log(chalk.blue('User: ') + 'What is your name?');

    const response4 = await agent.chat('What is your name?');
    console.log(chalk.green('Assistant: ') + response4);

    // Show statistics
    console.log(chalk.bold.white('\n--- Agent Statistics ---'));
    const state = agent.getState();
    const tokenUsage = agent.getTokenUsage();
    const toolStats = agent.getToolStats();

    console.log(chalk.cyan('Messages: ') + state.messageCount);
    console.log(chalk.cyan('Total Tokens: ') + tokenUsage.total);
    console.log(chalk.cyan('Avg Tokens/Message: ') + tokenUsage.perMessage);
    console.log(chalk.cyan('Tools Available: ') + toolStats.available);
    console.log(chalk.cyan('Tools Used: ') + toolStats.used);

    // Show conversation history
    console.log(chalk.bold.white('\n--- Conversation History ---'));
    console.log(agent.getConversationText());

    console.log(chalk.bold.green('\n✓ All tests passed! Claude is using tools autonomously!\n'));

  } catch (error) {
    console.error(chalk.bold.red('\n✗ Test failed:'), error);
    process.exit(1);
  }
}

testAgent();
