/**
 * Calculator Tool Tests
 *
 * Tests for the CalculatorTool to verify correct behavior.
 *
 * BEGINNER NOTE: Testing AI tools is different from testing AI responses.
 * The tool itself is deterministic (same input = same output), so we can
 * write reliable tests for it.
 *
 * Phase 11: Production Readiness
 */

import { createCalculatorTool, CalculatorTool } from '../../src/tools/definitions/CalculatorTool.js';

/**
 * Simple test result tracker
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Helper to run a test
 */
async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg });
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${errorMsg}`);
  }
}

/**
 * Simple assertion helpers
 */
function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value: boolean, message?: string): void {
  if (!value) {
    throw new Error(message || `Expected true, got false`);
  }
}

function assertFalse(value: boolean, message?: string): void {
  if (value) {
    throw new Error(message || `Expected false, got true`);
  }
}

/**
 * Run all calculator tests
 */
async function runTests(): Promise<void> {
  console.log('\n🧪 Calculator Tool Tests\n');

  let calculator: CalculatorTool;

  // Setup
  calculator = createCalculatorTool();

  // Test: Tool has correct name
  await test('Tool has correct name', () => {
    assertEqual(calculator.name, 'calculator');
  });

  // Test: Tool has a description
  await test('Tool has a description', () => {
    assertTrue(calculator.description.length > 0);
  });

  // Test: Addition
  await test('Addition: 2 + 3 = 5', async () => {
    const result = await calculator.run({ operation: 'add', a: 2, b: 3 });
    assertTrue(result.success);
    assertEqual(result.data?.result, 5);
  });

  // Test: Subtraction
  await test('Subtraction: 10 - 4 = 6', async () => {
    const result = await calculator.run({ operation: 'subtract', a: 10, b: 4 });
    assertTrue(result.success);
    assertEqual(result.data?.result, 6);
  });

  // Test: Multiplication
  await test('Multiplication: 6 * 7 = 42', async () => {
    const result = await calculator.run({ operation: 'multiply', a: 6, b: 7 });
    assertTrue(result.success);
    assertEqual(result.data?.result, 42);
  });

  // Test: Division
  await test('Division: 20 / 4 = 5', async () => {
    const result = await calculator.run({ operation: 'divide', a: 20, b: 4 });
    assertTrue(result.success);
    assertEqual(result.data?.result, 5);
  });

  // Test: Division by zero
  await test('Division by zero returns error', async () => {
    const result = await calculator.run({ operation: 'divide', a: 10, b: 0 });
    assertFalse(result.success);
    assertTrue(result.error?.includes('divide by zero') || result.error?.includes('Division by zero'));
  });

  // Test: Negative numbers
  await test('Handles negative numbers', async () => {
    const result = await calculator.run({ operation: 'add', a: -5, b: 3 });
    assertTrue(result.success);
    assertEqual(result.data?.result, -2);
  });

  // Test: Decimal numbers
  await test('Handles decimal numbers', async () => {
    const result = await calculator.run({ operation: 'multiply', a: 1.5, b: 2 });
    assertTrue(result.success);
    assertEqual(result.data?.result, 3);
  });

  // Test: Invalid operation
  await test('Invalid operation returns error', async () => {
    const result = await calculator.run({ operation: 'power' as any, a: 2, b: 3 });
    assertFalse(result.success);
  });

  // Test: Missing parameters
  await test('Missing parameters returns error', async () => {
    const result = await calculator.run({ operation: 'add', a: 5 } as any);
    assertFalse(result.success);
  });

  // Test: Expression is included in result
  await test('Result includes expression', async () => {
    const result = await calculator.run({ operation: 'add', a: 2, b: 3 });
    assertTrue(result.success);
    assertEqual(result.data?.expression, '2 + 3 = 5');
  });

  // Test: Converts to Anthropic format
  await test('Converts to Anthropic format correctly', () => {
    const anthropicFormat = calculator.toAnthropicFormat();
    assertEqual(anthropicFormat.name, 'calculator');
    assertTrue(anthropicFormat.description.length > 0);
    assertTrue(typeof anthropicFormat.input_schema === 'object');
  });

  // Print summary
  console.log('\n' + '─'.repeat(40));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
