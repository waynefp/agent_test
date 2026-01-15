/**
 * Agent SDK Learning Project - Main Entry Point
 *
 * This is where the application starts!
 *
 * BEGINNER NOTE: When you run `npm run dev`, this file is executed.
 * Now it starts an interactive chat session with Claude!
 */

import { logger } from './utils/logger.js';
import { validateEnvironment } from './config/environment.js';
import { createAgent } from './agent/Agent.js';
import { startChatSession } from './cli/commands.js';
import { getErrorMessage } from './utils/errors.js';

/**
 * Main function
 * BEGINNER NOTE: This is the entry point of the application
 */
async function main(): Promise<void> {
  try {
    // Validate environment variables
    logger.info('Validating environment configuration...');
    validateEnvironment();
    logger.success('Environment configuration valid!');

    // Create the agent
    logger.info('Creating agent...');
    const agent = createAgent({
      // You can customize the agent here
      // temperature: 0.7,  // Lower = more focused, higher = more creative
      // maxTokens: 4096,   // Maximum length of responses
    });
    logger.success('Agent created successfully!');

    // Start the interactive chat session
    logger.info('Starting interactive chat session...');
    await startChatSession(agent);

  } catch (error) {
    // Handle errors gracefully
    logger.error('Failed to start application:', error);
    logger.error(getErrorMessage(error));

    // Exit with error code
    process.exit(1);
  }
}

// Handle process interruption (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n\nGoodbye! Thanks for using the Agent SDK Learning Project.');
  process.exit(0);
});

// Run the main function
// BEGINNER NOTE: This immediately executes the main function when the file loads
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
