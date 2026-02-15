/**
 * Parallel Tool Execution Demo (Phase 19)
 *
 * Demonstrates the performance benefits of parallel vs sequential execution.
 * This demo creates a slow tool that simulates API calls with delays,
 * then compares the execution time when running tools sequentially vs in parallel.
 *
 * BEGINNER NOTE: This shows how parallel execution can dramatically speed up
 * workflows when multiple independent tools need to run.
 */

import { Agent } from '../agent/Agent.js';
import { BaseTool } from '../tools/definitions/BaseTool.js';
import type { ToolResult } from '../types/tool.types.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

/**
 * SlowTool - Simulates a slow operation (like an API call)
 * BEGINNER NOTE: This tool just waits for a specified time to demonstrate
 * how parallel execution can reduce total wait time.
 */
class SlowTool extends BaseTool {
  name = 'slow_tool';
  description = 'Simulates a slow operation with a configurable delay';

  inputSchema = z.object({
    delay: z.number().describe('Delay in milliseconds'),
    label: z.string().describe('Label for this operation'),
  });

  async execute(input: unknown): Promise<ToolResult> {
    // Parse and validate input
    const parsed = this.inputSchema.parse(input) as { delay: number; label: string };

    logger.info(`Starting ${parsed.label} (${parsed.delay}ms delay)...`);

    // Wait for the specified delay
    await new Promise((resolve) => setTimeout(resolve, parsed.delay));

    logger.success(`Completed ${parsed.label} after ${parsed.delay}ms`);

    return {
      success: true,
      data: { message: `${parsed.label} completed after ${parsed.delay}ms` },
    };
  }
}

/**
 * Test sequential execution
 * BEGINNER NOTE: Tools run one-by-one, waiting for each to finish
 */
async function testSequential() {
  console.log('\n' + '='.repeat(60));
  console.log('SEQUENTIAL EXECUTION TEST');
  console.log('='.repeat(60) + '\n');

  const agent = new Agent(
    {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1024,
      enableTools: true,
      enableParallelTools: false, // Sequential execution
    },
    [new SlowTool()]
  );

  const startTime = Date.now();

  // Ask Claude to use the slow tool 3 times
  // BEGINNER NOTE: In sequential mode, these will run one-by-one
  await agent.chat(
    'Use slow_tool three times with these parameters:\n' +
      '1. delay: 1000, label: "API Call 1"\n' +
      '2. delay: 500, label: "Database Query"\n' +
      '3. delay: 800, label: "File Processing"'
  );

  const totalTime = Date.now() - startTime;

  console.log('\n' + '-'.repeat(60));
  console.log(`Sequential total time: ${totalTime}ms`);
  console.log(`Expected: ~2300ms (1000 + 500 + 800)`);
  console.log('-'.repeat(60) + '\n');

  return totalTime;
}

/**
 * Test parallel execution
 * BEGINNER NOTE: All tools run simultaneously - limited by the slowest one
 */
async function testParallel() {
  console.log('\n' + '='.repeat(60));
  console.log('PARALLEL EXECUTION TEST');
  console.log('='.repeat(60) + '\n');

  const agent = new Agent(
    {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1024,
      enableTools: true,
      enableParallelTools: true, // Parallel execution enabled!
    },
    [new SlowTool()]
  );

  const startTime = Date.now();

  // Same request as sequential test
  // BEGINNER NOTE: In parallel mode, all three will run at the same time
  await agent.chat(
    'Use slow_tool three times with these parameters:\n' +
      '1. delay: 1000, label: "API Call 1"\n' +
      '2. delay: 500, label: "Database Query"\n' +
      '3. delay: 800, label: "File Processing"'
  );

  const totalTime = Date.now() - startTime;

  console.log('\n' + '-'.repeat(60));
  console.log(`Parallel total time: ${totalTime}ms`);
  console.log(`Expected: ~1000ms (limited by slowest tool)`);
  console.log('-'.repeat(60) + '\n');

  return totalTime;
}

/**
 * Main demo function
 */
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Phase 19: Parallel Tool Execution Demo                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Run sequential test
    const sequentialTime = await testSequential();

    // Wait a bit between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Run parallel test
    const parallelTime = await testParallel();

    // Calculate speedup
    const speedup = sequentialTime / parallelTime;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Sequential time: ${sequentialTime}ms`);
    console.log(`Parallel time:   ${parallelTime}ms`);
    console.log(`Speedup:         ${speedup.toFixed(2)}x faster`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Demo complete!');
    console.log('\nKey Takeaways:');
    console.log('  • Parallel execution runs all tools simultaneously');
    console.log('  • Total time is limited by the slowest tool');
    console.log('  • Best for independent tools (no dependencies)');
    console.log('  • Use /parallel-tools in CLI to toggle this feature\n');
  } catch (error) {
    logger.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
main();
