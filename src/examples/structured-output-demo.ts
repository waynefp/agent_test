/**
 * Structured Output Demo
 *
 * Demonstrates how to use structured outputs (JSON mode) to extract
 * typed data from conversations.
 *
 * BEGINNER NOTE: This shows the chatStructured() method, which forces
 * Claude to return JSON matching a Zod schema. Great for data extraction!
 *
 * Phase 17: Structured Outputs
 */

import { createAgent } from '../agent/Agent.js';
import { z } from 'zod';
import chalk from 'chalk';

// Define a schema for contact extraction
const contactSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
});

async function main() {
  console.log(chalk.bold.cyan('\n📋 Structured Output Demo\n'));

  const agent = createAgent({
    model: 'claude-3-7-sonnet-20250219',
    maxTokens: 2048,
  });

  const emailText = `
    Hi, I'm John Doe from Acme Corp.
    You can reach me at john.doe@acme.com or call 555-1234.
    Looking forward to connecting!
  `;

  console.log(chalk.gray('Email text:'));
  console.log(emailText);
  console.log(chalk.yellow('\nExtracting contact info as structured JSON...\n'));

  const result = await agent.chatStructured(
    `Extract contact information from this email:\n\n${emailText}`,
    contactSchema
  );

  if (result.success) {
    console.log(chalk.green('✓ Validation successful!\n'));
    console.log(chalk.bold('Contact Info:'));
    console.log(`  Name:    ${result.data.name}`);
    console.log(`  Email:   ${result.data.email}`);
    console.log(`  Phone:   ${result.data.phone || 'N/A'}`);
    console.log(`  Company: ${result.data.company || 'N/A'}`);

    console.log(chalk.gray('\nRaw JSON:'));
    console.log(chalk.gray(result.rawText));
  } else {
    console.error(chalk.red('✗ Validation failed:'), result.error);
    if (result.validationErrors) {
      console.error(chalk.red('Validation errors:'));
      result.validationErrors.errors.forEach((err) => {
        console.error(chalk.red(`  - ${err.path.join('.')}: ${err.message}`));
      });
    }
    console.error(chalk.gray('Raw text:'), result.rawText);
  }
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});
