/**
 * Environment Configuration
 *
 * This file loads environment variables from .env file and validates them.
 * It provides type-safe access to configuration values throughout the app.
 *
 * BEGINNER NOTE: Environment variables are a secure way to store sensitive data
 * like API keys. Never commit your .env file to git!
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
dotenv.config();

/**
 * Get the project root directory
 * BEGINNER NOTE: In ES modules, __dirname isn't available, so we construct it
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const _projectRoot = join(__dirname, '../..');

/**
 * Validate that required environment variables are present
 * Throws an error if any required variables are missing
 */
export function validateEnvironment(): void {
  const required = ['ANTHROPIC_API_KEY'];
  const missing: string[] = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n\n` +
      `Please create a .env file in the project root with these variables.\n` +
      `You can copy .env.example as a starting point:\n` +
      `  cp .env.example .env\n\n` +
      `Then edit .env and add your ANTHROPIC_API_KEY from:\n` +
      `  https://console.anthropic.com/settings/keys`
    );
  }
}

/**
 * Type-safe environment configuration object
 * BEGINNER NOTE: This interface ensures we always know what type each config value is
 */
export interface EnvironmentConfig {
  // Anthropic API settings
  anthropicApiKey: string;
  anthropicModel: string;
  maxTokens: number;

  // Data storage paths
  conversationsDir: string;
  tasksDir: string;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Project paths
  projectRoot: string;
}

/**
 * Get the environment configuration with defaults
 * BEGINNER NOTE: The '||' operator provides fallback values if env vars aren't set
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  // Validate required variables first
  validateEnvironment();

  return {
    // Required
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,

    // Optional with defaults
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
    maxTokens: parseInt(process.env.MAX_TOKENS || '2048', 10),

    // Data directories (relative to project root)
    conversationsDir: process.env.CONVERSATIONS_DIR || join(_projectRoot, 'data', 'conversations'),
    tasksDir: process.env.TASKS_DIR || join(_projectRoot, 'data', 'tasks'),

    // Logging
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',

    // Paths
    projectRoot: _projectRoot,
  };
}

/**
 * Export a singleton instance of the configuration
 * BEGINNER NOTE: This is created once when the module is imported,
 * so all parts of your app use the same configuration
 */
export const env = getEnvironmentConfig();

/**
 * Export individual values for convenience
 * BEGINNER NOTE: This allows you to import just what you need:
 * import { ANTHROPIC_API_KEY } from '@config/environment';
 */
export const {
  anthropicApiKey: ANTHROPIC_API_KEY,
  anthropicModel: ANTHROPIC_MODEL,
  maxTokens: MAX_TOKENS,
  conversationsDir: CONVERSATIONS_DIR,
  tasksDir: TASKS_DIR,
  logLevel: LOG_LEVEL,
  projectRoot: PROJECT_ROOT,
} = env;
