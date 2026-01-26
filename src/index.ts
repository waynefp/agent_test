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
import { createTaskTracker } from './agent/TaskTracker.js';
import { createTaskPersistence } from './persistence/TaskPersistence.js';
import { startChatSession } from './cli/commands.js';
import { getErrorMessage } from './utils/errors.js';
import {
  createCalculatorTool,
  createFileSystemTool,
  createTaskTool,
  createMemoryTool,
  createWebSearchTool,
} from './tools/definitions/index.js';

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

    // Create task tracker with persistence (needed for TaskTool)
    logger.info('Creating task tracker...');
    const taskPersistence = createTaskPersistence('./data');
    const taskTracker = createTaskTracker({
      save: (tasks) => taskPersistence.save(tasks),
      load: () => taskPersistence.load(),
    });
    await taskTracker.initialize();
    logger.success(`Task tracker ready! ${taskTracker.getTaskCount()} task(s) loaded.`);

    // Create tools
    logger.info('Creating tools...');
    const calculator = createCalculatorTool();
    const fileSystem = createFileSystemTool('./workspace');
    const taskTool = createTaskTool(taskTracker);
    const memoryTool = createMemoryTool();  // Phase 10: Long-term memory
    const webSearchTool = createWebSearchTool();  // Phase 10: Web search
    logger.success('Tools created: calculator, file_system, task_manager, memory, web_search');

    // Create the agent WITH TOOLS
    logger.info('Creating agent with tools...');
    const agent = createAgent(
      {
        enableTools: true,  // Enable tool usage!
        // temperature: 0.7,  // Lower = more focused, higher = more creative
        // maxTokens: 4096,   // Maximum length of responses
      },
      [calculator, fileSystem, taskTool, memoryTool, webSearchTool]  // All tools
    );
    logger.success(`Agent created with ${agent.getAvailableTools().length} tool(s): ${agent.getAvailableTools().join(', ')}`);

    // Start the interactive chat session
    logger.info('Starting interactive chat session...');
    await startChatSession(agent, taskTracker);

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
