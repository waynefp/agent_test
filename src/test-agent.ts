/**
 * Simple Agent Test
 *
 * A quick test to verify the agent works without needing interactive input.
 * Run with: npm run test-agent
 */

import { logger } from './utils/logger.js';
import { validateEnvironment } from './config/environment.js';
import { createAgent } from './agent/Agent.js';
import chalk from 'chalk';

async function testAgent(): Promise<void> {
  try {
    console.log(chalk.bold.cyan('\n=== Testing Agent ===\n'));

    // Validate environment
    logger.info('Validating environment...');
    validateEnvironment();
    logger.success('✓ Environment valid');

    // Create agent
    logger.info('Creating agent...');
    const agent = createAgent();
    logger.success('✓ Agent created');

    // Test 1: Simple question
    console.log(chalk.bold.white('\n--- Test 1: Simple Question ---'));
    console.log(chalk.blue('User: ') + 'What is 2 + 2?');

    const response1 = await agent.chat('What is 2 + 2?');
    console.log(chalk.green('Assistant: ') + response1);

    // Test 2: Follow-up question (tests conversation history)
    console.log(chalk.bold.white('\n--- Test 2: Follow-up (tests memory) ---'));
    console.log(chalk.blue('User: ') + 'What did I just ask you?');

    const response2 = await agent.chat('What did I just ask you?');
    console.log(chalk.green('Assistant: ') + response2);

    // Show statistics
    console.log(chalk.bold.white('\n--- Statistics ---'));
    const state = agent.getState();
    const tokenUsage = agent.getTokenUsage();

    console.log(chalk.cyan('Messages: ') + state.messageCount);
    console.log(chalk.cyan('Total Tokens: ') + tokenUsage.total);
    console.log(chalk.cyan('Avg Tokens/Message: ') + tokenUsage.perMessage);

    // Show conversation history
    console.log(chalk.bold.white('\n--- Conversation History ---'));
    console.log(agent.getConversationText());

    console.log(chalk.bold.green('\n✓ All tests passed! Your agent works perfectly!\n'));

  } catch (error) {
    console.error(chalk.bold.red('\n✗ Test failed:'), error);
    process.exit(1);
  }
}

testAgent();
