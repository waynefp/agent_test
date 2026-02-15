/**
 * Google Drive Authentication Helper
 *
 * Helps set up OAuth authentication for Google Drive API access.
 *
 * BEGINNER NOTE: This script guides you through the OAuth authentication process.
 * You'll get a URL to visit, authorize the app, and paste back the auth code.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import * as readline from 'readline/promises';
import { logger } from '../utils/logger.js';

/**
 * OAuth configuration paths
 */
const OAUTH_CREDS_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.config',
  'google-drive-mcp',
  'gcp-oauth.keys.json'
);

const TOKENS_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.config',
  'google-drive-mcp',
  'tokens.json'
);

/**
 * Required Google Drive API scopes
 *
 * BEGINNER NOTE: Scopes define what permissions our app needs.
 * We need full Drive access to create files and folders.
 */
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

/**
 * Run the OAuth authentication flow
 */
async function authenticate() {
  logger.info('='.repeat(60));
  logger.info('Google Drive OAuth Authentication');
  logger.info('='.repeat(60));

  try {
    // Step 1: Load OAuth credentials
    logger.info('\n📋 Step 1: Loading OAuth credentials...');
    const credsContent = await fs.readFile(OAUTH_CREDS_PATH, 'utf-8');
    const credentials = JSON.parse(credsContent);
    const { client_id, client_secret, redirect_uris } = credentials.installed;

    logger.info(`✅ Loaded credentials for client: ${client_id.substring(0, 20)}...`);

    // Step 2: Create OAuth2 client
    logger.info('\n📋 Step 2: Creating OAuth2 client...');

    // BEGINNER NOTE: We use 'urn:ietf:wg:oauth:2.0:oob' which tells Google
    // to show the code on their page instead of redirecting to localhost
    const auth = new google.auth.OAuth2(
      client_id,
      client_secret,
      'urn:ietf:wg:oauth:2.0:oob' // Out-of-band mode - shows code on Google's page
    );

    logger.info('✅ OAuth2 client created');

    // Step 3: Generate auth URL
    logger.info('\n📋 Step 3: Generating authorization URL...');
    const authUrl = auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force to get refresh token
    });

    logger.info('✅ Authorization URL generated');
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('PLEASE FOLLOW THESE STEPS:');
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('1. Open this URL in your browser:');
    logger.info('');
    logger.info(`   ${authUrl}`);
    logger.info('');
    logger.info('2. Sign in with your Google account');
    logger.info('3. Grant the requested permissions');
    logger.info('4. Google will show you an authorization code on the page');
    logger.info('5. Copy the ENTIRE code (it\'s long, starts with "4/0A...")');
    logger.info('6. Paste it below when prompted');
    logger.info('');
    logger.info('NOTE: The code will be displayed on Google\'s page, NOT in the URL bar.');
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('');

    // Step 4: Get auth code from user
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await rl.question('Enter the authorization code: ');
    rl.close();

    logger.info('\n📋 Step 4: Exchanging code for tokens...');

    // Step 5: Exchange code for tokens
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);

    logger.info('✅ Tokens received!');
    logger.info(`   Access token: ${tokens.access_token?.substring(0, 20)}...`);
    logger.info(`   Refresh token: ${tokens.refresh_token ? 'Present' : 'Missing'}`);

    if (!tokens.refresh_token) {
      logger.warn('⚠️  No refresh token received!');
      logger.warn('   This may happen if you\'ve already authorized this app.');
      logger.warn('   Try revoking access at: https://myaccount.google.com/permissions');
      logger.warn('   Then run this script again.');
    }

    // Step 6: Save tokens
    logger.info('\n📋 Step 5: Saving tokens...');
    await fs.writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2), 'utf-8');
    logger.info(`✅ Tokens saved to: ${TOKENS_PATH}`);

    // Success!
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('✅ AUTHENTICATION SUCCESSFUL!');
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('Your Google Drive API is now authenticated!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('  1. Test the integration: npm run test:gdrive');
    logger.info('  2. Sync your learning guides: npm start -> /sync-gdrive learning');
    logger.info('');
  } catch (error) {
    logger.error('\n❌ AUTHENTICATION FAILED');
    logger.error('='.repeat(60));
    logger.error('Error:', error);
    logger.error('');
    logger.error('Troubleshooting:');
    logger.error('  1. Make sure OAuth credentials exist at:');
    logger.error(`     ${OAUTH_CREDS_PATH}`);
    logger.error('  2. Verify you entered the complete authorization code');
    logger.error('  3. Check that you have internet connection');
    logger.error('  4. Ensure your Google Cloud project is properly configured');
    logger.error('');
    process.exit(1);
  }
}

// Run authentication
authenticate().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(1);
});
