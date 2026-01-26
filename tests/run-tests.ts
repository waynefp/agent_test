/**
 * Test Runner
 *
 * Runs all tests in the test suite.
 *
 * BEGINNER NOTE: This script discovers and runs all test files.
 * In a production project, you might use a test framework like
 * Vitest or Jest, but this simple runner works great for learning.
 *
 * Phase 11: Production Readiness
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestFileResult {
  file: string;
  passed: boolean;
  output: string;
}

/**
 * Find all test files
 */
function findTestFiles(dir: string): string[] {
  const testFiles: string[] = [];

  function scan(directory: string): void {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
        testFiles.push(fullPath);
      }
    }
  }

  scan(dir);
  return testFiles;
}

/**
 * Run a single test file
 */
async function runTestFile(filePath: string): Promise<TestFileResult> {
  return new Promise((resolve) => {
    const relativePath = path.relative(__dirname, filePath);
    let output = '';

    const proc = spawn('npx', ['tsx', filePath], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        file: relativePath,
        passed: code === 0,
        output,
      });
    });

    proc.on('error', (err) => {
      resolve({
        file: relativePath,
        passed: false,
        output: `Failed to run: ${err.message}`,
      });
    });
  });
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('═'.repeat(50));
  console.log('  🧪 Agent SDK Test Suite');
  console.log('═'.repeat(50));
  console.log();

  // Find all test files
  const testFiles = findTestFiles(__dirname);

  if (testFiles.length === 0) {
    console.log('No test files found!');
    console.log('Test files should be named *.test.ts');
    process.exit(1);
  }

  console.log(`Found ${testFiles.length} test file(s):\n`);

  // Run each test file
  const results: TestFileResult[] = [];

  for (const file of testFiles) {
    const relativePath = path.relative(__dirname, file);
    console.log(`Running ${relativePath}...`);

    const result = await runTestFile(file);
    results.push(result);

    // Print test output
    console.log(result.output);

    if (result.passed) {
      console.log(`✓ ${relativePath} PASSED\n`);
    } else {
      console.log(`✗ ${relativePath} FAILED\n`);
    }
  }

  // Print summary
  console.log('═'.repeat(50));
  console.log('  Test Summary');
  console.log('═'.repeat(50));

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  console.log(`\n  Total:  ${results.length} file(s)`);
  console.log(`  Passed: ${passed.length}`);
  console.log(`  Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n  Failed test files:');
    for (const result of failed) {
      console.log(`    - ${result.file}`);
    }
    console.log();
    process.exit(1);
  }

  console.log('\n  ✓ All tests passed!\n');
}

main().catch(error => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
