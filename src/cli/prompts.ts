/**
 * CLI Prompts
 *
 * Functions for getting user input via inquirer.
 *
 * BEGINNER NOTE: Inquirer makes it easy to ask the user questions
 * and get their answers in a nice, interactive way.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Get a message from the user
 * BEGINNER NOTE: This shows a prompt and waits for the user to type something
 *
 * @returns The user's message
 */
export async function getUserMessage(): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'message',
      message: chalk.bold.blue('You:'),
      validate: (input: string) => {
        if (input.trim().length === 0) {
          return 'Please enter a message';
        }
        return true;
      },
    },
  ]);

  return answers.message.trim();
}

/**
 * Ask the user to confirm an action
 * BEGINNER NOTE: Get a yes/no answer from the user
 *
 * @param message - The question to ask
 * @returns true if user answered yes, false if no
 */
export async function confirmAction(message: string): Promise<boolean> {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
    },
  ]);

  return answers.confirmed;
}

/**
 * Let the user select from a list of options
 * BEGINNER NOTE: Show a menu and let the user pick one
 *
 * @param message - The question to ask
 * @param choices - Array of choices
 * @returns The selected choice
 */
export async function selectOption(
  message: string,
  choices: string[]
): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message,
      choices,
    },
  ]);

  return answers.selection;
}

/**
 * Get the user's API key
 * BEGINNER NOTE: Ask for the API key with masked input (like a password)
 *
 * @returns The API key
 */
export async function getApiKey(): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Anthropic API Key:',
      mask: '*',
      validate: (input: string) => {
        if (input.trim().length === 0) {
          return 'API key is required';
        }
        if (!input.startsWith('sk-ant-')) {
          return 'API key should start with "sk-ant-"';
        }
        return true;
      },
    },
  ]);

  return answers.apiKey.trim();
}
