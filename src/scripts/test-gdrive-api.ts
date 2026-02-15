/**
 * Google Drive API Test Script
 *
 * Tests the Google Drive API integration to verify it works correctly.
 *
 * BEGINNER NOTE: This script tests our direct Google Drive API implementation
 * by creating a test file, verifying it exists, and reporting the results.
 */

import { getGoogleDriveService } from '../utils/gdrive-api-service.js';
import { logger } from '../utils/logger.js';

/**
 * Test the Google Drive API service
 */
async function testGoogleDriveAPI() {
  logger.info('='.repeat(60));
  logger.info('Google Drive API Test');
  logger.info('='.repeat(60));

  try {
    // Step 1: Initialize the service
    logger.info('\n📋 Step 1: Initializing Google Drive API service...');
    const gdrive = await getGoogleDriveService();
    logger.info('✅ Service initialized successfully');

    // Step 2: Create a test file
    logger.info('\n📋 Step 2: Creating test file...');
    const testContent = `Hello from Agent SDK Test!

This is a test file created by the Google Drive API integration.

Created at: ${new Date().toISOString()}

If you can see this file in your Google Drive, the integration is working! 🎉
`;

    const fileId = await gdrive.createTextFile(
      'agent-sdk-test.txt',
      testContent
    );

    logger.info(`✅ Test file created successfully!`);
    logger.info(`   File ID: ${fileId}`);
    logger.info(`   File name: agent-sdk-test.txt`);
    logger.info(`   Location: Root of Google Drive`);

    // Step 3: Search for the file to verify it exists
    logger.info('\n📋 Step 3: Verifying file exists...');
    const searchResults = await gdrive.search('agent-sdk-test');

    if (searchResults.files.length > 0) {
      logger.info(`✅ File found in search results!`);
      logger.info(`   Found ${searchResults.files.length} matching file(s)`);
      searchResults.files.forEach((file) => {
        logger.info(`   - ${file.name} (ID: ${file.id})`);
      });
    } else {
      logger.warn('⚠️  File not found in search (may take a moment to index)');
    }

    // Step 4: Test folder creation
    logger.info('\n📋 Step 4: Testing folder creation...');
    const folderId = await gdrive.createFolder('Agent SDK Test Folder');
    logger.info(`✅ Folder created successfully!`);
    logger.info(`   Folder ID: ${folderId}`);

    // Step 5: Create a file in the folder
    logger.info('\n📋 Step 5: Creating file in folder...');
    const fileInFolderId = await gdrive.createTextFile(
      'test-file-in-folder.txt',
      'This file is inside a folder!',
      folderId
    );
    logger.info(`✅ File created in folder!`);
    logger.info(`   File ID: ${fileInFolderId}`);

    // Step 6: Test folder path creation
    logger.info('\n📋 Step 6: Testing nested folder creation...');
    const nestedFolderId = await gdrive.ensureFolderPath(
      'Agent SDK/Test/Nested/Path'
    );
    logger.info(`✅ Nested folder path created!`);
    logger.info(`   Final folder ID: ${nestedFolderId}`);

    // Success summary
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ ALL TESTS PASSED!');
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('Google Drive API integration is working correctly!');
    logger.info('');
    logger.info('Check your Google Drive to see the test files:');
    logger.info('  - agent-sdk-test.txt (in root)');
    logger.info('  - Agent SDK Test Folder/test-file-in-folder.txt');
    logger.info('  - Agent SDK/Test/Nested/Path/ (empty folder structure)');
    logger.info('');
    logger.info('You can safely delete these test files and folders.');
    logger.info('');
    logger.info('Next step: Try syncing your learning guides with:');
    logger.info('  npm start');
    logger.info('  /sync-gdrive learning');
    logger.info('');
    logger.info('='.repeat(60));
  } catch (error) {
    logger.error('\n❌ TEST FAILED');
    logger.error('='.repeat(60));
    logger.error('Error:', error);
    logger.error('');
    logger.error('Troubleshooting:');
    logger.error('  1. Check that OAuth credentials exist:');
    logger.error('     C:\\Users\\suzbp\\.config\\google-drive-mcp\\gcp-oauth.keys.json');
    logger.error('  2. Check that tokens exist:');
    logger.error('     C:\\Users\\suzbp\\.config\\google-drive-mcp\\tokens.json');
    logger.error('  3. Verify tokens are not expired');
    logger.error('');
    process.exit(1);
  }
}

// Run the test
testGoogleDriveAPI().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(1);
});
