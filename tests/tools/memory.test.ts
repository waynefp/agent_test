/**
 * Memory Tool Tests
 *
 * Tests for the MemoryTool to verify correct behavior.
 *
 * BEGINNER NOTE: The memory tool needs a store to work. For testing,
 * we create a fresh store that doesn't persist to disk.
 *
 * Phase 11: Production Readiness
 */

import { MemoryTool, createMemoryTool } from '../../src/tools/definitions/MemoryTool.js';
import { createMemoryStore } from '../../src/persistence/MemoryStore.js';

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
 * Run all memory tool tests
 */
async function runTests(): Promise<void> {
  console.log('\n🧪 Memory Tool Tests\n');

  // Create a fresh memory store for testing (with test path)
  const testStore = createMemoryStore('./tests/data/test-memories.json');

  // Clear any existing test data
  const categories = await testStore.getCategories();
  for (const category of categories) {
    const entries = await testStore.listByCategory(category);
    for (const entry of entries) {
      await testStore.delete(entry.id);
    }
  }

  const memoryTool: MemoryTool = createMemoryTool(testStore);

  // Test: Tool has correct name
  await test('Tool has correct name', () => {
    assertEqual(memoryTool.name, 'memory');
  });

  // Test: Tool has a description
  await test('Tool has a description', () => {
    assertTrue(memoryTool.description.length > 0);
  });

  // Test: Store a memory
  await test('Can store a memory', async () => {
    const result = await memoryTool.run({
      operation: 'store',
      category: 'test',
      key: 'favorite_color',
      content: 'blue',
    });
    assertTrue(result.success, `Failed: ${result.error}`);
    assertEqual(result.data?.message, 'Memory stored successfully');
  });

  // Test: Recall a memory
  await test('Can recall a stored memory', async () => {
    const result = await memoryTool.run({
      operation: 'recall',
      category: 'test',
      key: 'favorite_color',
    });
    assertTrue(result.success);
    assertTrue(result.data?.found);
    assertEqual(result.data?.content, 'blue');
  });

  // Test: Recall non-existent memory
  await test('Returns not found for missing memory', async () => {
    const result = await memoryTool.run({
      operation: 'recall',
      category: 'test',
      key: 'does_not_exist',
    });
    assertTrue(result.success); // Operation succeeded, memory just doesn't exist
    assertFalse(result.data?.found);
  });

  // Test: Update a memory
  await test('Can update an existing memory', async () => {
    // Store initial
    await memoryTool.run({
      operation: 'store',
      category: 'test',
      key: 'name',
      content: 'Alice',
    });

    // Update
    const result = await memoryTool.run({
      operation: 'store',
      category: 'test',
      key: 'name',
      content: 'Bob',
    });

    assertTrue(result.success);
    assertTrue(result.data?.isUpdate);

    // Verify update
    const recall = await memoryTool.run({
      operation: 'recall',
      category: 'test',
      key: 'name',
    });
    assertEqual(recall.data?.content, 'Bob');
  });

  // Test: Search memories
  await test('Can search memories', async () => {
    // Store some searchable content
    await memoryTool.run({
      operation: 'store',
      category: 'preferences',
      key: 'language',
      content: 'TypeScript is my favorite',
    });

    const result = await memoryTool.run({
      operation: 'search',
      query: 'TypeScript',
    });

    assertTrue(result.success);
    assertTrue(result.data?.found);
    assertTrue(result.data?.totalCount > 0);
  });

  // Test: List categories
  await test('Can list categories', async () => {
    const result = await memoryTool.run({
      operation: 'list',
    });

    assertTrue(result.success);
    assertTrue(result.data?.categories?.length > 0);
  });

  // Test: List memories in category
  await test('Can list memories in a category', async () => {
    const result = await memoryTool.run({
      operation: 'list',
      category: 'test',
    });

    assertTrue(result.success);
    assertTrue(result.data?.count > 0);
    assertTrue(result.data?.memories?.length > 0);
  });

  // Test: Delete a memory
  await test('Can delete a memory', async () => {
    // Store a memory to delete
    await memoryTool.run({
      operation: 'store',
      category: 'test',
      key: 'to_delete',
      content: 'delete me',
    });

    // Delete it
    const result = await memoryTool.run({
      operation: 'delete',
      category: 'test',
      key: 'to_delete',
    });

    assertTrue(result.success);
    assertTrue(result.data?.deleted);

    // Verify deletion
    const recall = await memoryTool.run({
      operation: 'recall',
      category: 'test',
      key: 'to_delete',
    });
    assertFalse(recall.data?.found);
  });

  // Test: Store requires category
  await test('Store requires category', async () => {
    const result = await memoryTool.run({
      operation: 'store',
      key: 'test',
      content: 'test',
    });
    assertFalse(result.success);
  });

  // Test: Store requires key
  await test('Store requires key', async () => {
    const result = await memoryTool.run({
      operation: 'store',
      category: 'test',
      content: 'test',
    });
    assertFalse(result.success);
  });

  // Test: Store requires content
  await test('Store requires content', async () => {
    const result = await memoryTool.run({
      operation: 'store',
      category: 'test',
      key: 'test',
    });
    assertFalse(result.success);
  });

  // Test: Search requires query
  await test('Search requires query', async () => {
    const result = await memoryTool.run({
      operation: 'search',
    });
    assertFalse(result.success);
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
