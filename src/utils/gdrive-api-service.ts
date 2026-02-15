/**
 * Google Drive API Service
 *
 * Direct Google Drive API integration using googleapis package.
 * This replaces the MCP approach with direct API calls.
 *
 * BEGINNER NOTE: This service handles authentication and API calls to Google Drive.
 * We use the googleapis package (official Google client library) instead of MCP.
 * This gives us full control and doesn't depend on external MCP servers.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

/**
 * Google Drive file/folder info
 */
export interface GDriveItem {
  id: string;
  name: string;
  mimeType: string;
  parentId?: string;
}

/**
 * Google Drive search result
 */
export interface GDriveSearchResult {
  files: GDriveItem[];
  nextPageToken?: string;
}

/**
 * OAuth configuration paths
 *
 * BEGINNER NOTE: We load OAuth credentials from the same location
 * the Google Drive MCP was using, so we can reuse existing authentication.
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
 * Google Drive API Service Class
 *
 * BEGINNER NOTE: This class provides a clean interface to Google Drive.
 * It handles OAuth authentication and provides methods for common operations.
 */
export class GoogleDriveService {
  private auth: OAuth2Client | null = null;
  private drive: any = null;

  /**
   * Initialize the Google Drive service
   *
   * This loads OAuth credentials and tokens, then creates an authenticated client.
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Google Drive API service...');

    try {
      // Load OAuth credentials
      const credsContent = await fs.readFile(OAUTH_CREDS_PATH, 'utf-8');
      const credentials = JSON.parse(credsContent);
      const { client_id, client_secret, redirect_uris } = credentials.installed;

      // BEGINNER NOTE: OAuth2Client handles authentication with Google.
      // It manages access tokens and automatically refreshes them when expired.
      this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      // Load existing tokens
      const tokensContent = await fs.readFile(TOKENS_PATH, 'utf-8');
      const tokens = JSON.parse(tokensContent);

      // Set the tokens on the OAuth client
      this.auth.setCredentials(tokens);

      // BEGINNER NOTE: Create a Google Drive API client (v3).
      // This gives us access to all Drive API methods like files.create, files.list, etc.
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      logger.info('✅ Google Drive API service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Google Drive API service:', error);
      throw new Error(
        `Failed to initialize Google Drive service: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Ensure the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.drive) {
      throw new Error(
        'Google Drive service not initialized. Call initialize() first.'
      );
    }
  }

  /**
   * Create a text file in Google Drive
   *
   * @param name - File name
   * @param content - File content (text)
   * @param parentFolderId - Parent folder ID (optional, defaults to root)
   * @returns Created file ID
   */
  async createTextFile(
    name: string,
    content: string,
    parentFolderId?: string
  ): Promise<string> {
    this.ensureInitialized();

    logger.info(`Creating text file: ${name}`);

    try {
      // BEGINNER NOTE: Google Drive API uses multipart upload for files with content.
      // We specify the file metadata (name, mimeType, parents) and the file content.
      const fileMetadata: any = {
        name,
        mimeType: 'text/plain',
      };

      // If parent folder specified, set it
      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const media = {
        mimeType: 'text/plain',
        body: content,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, mimeType',
      });

      const fileId = response.data.id;
      logger.info(`✅ Created file: ${name} (ID: ${fileId})`);

      return fileId;
    } catch (error) {
      logger.error(`❌ Failed to create file ${name}:`, error);
      throw new Error(
        `Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a folder in Google Drive
   *
   * @param name - Folder name
   * @param parentFolderId - Parent folder ID (optional, defaults to root)
   * @returns Created folder ID
   */
  async createFolder(name: string, parentFolderId?: string): Promise<string> {
    this.ensureInitialized();

    logger.info(`Creating folder: ${name}`);

    try {
      // BEGINNER NOTE: Folders in Google Drive are just files with a special mimeType.
      // The mimeType 'application/vnd.google-apps.folder' indicates a folder.
      const fileMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType',
      });

      const folderId = response.data.id;
      logger.info(`✅ Created folder: ${name} (ID: ${folderId})`);

      return folderId;
    } catch (error) {
      logger.error(`❌ Failed to create folder ${name}:`, error);
      throw new Error(
        `Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for files/folders in Google Drive
   *
   * @param query - Search query (file name or Google Drive query syntax)
   * @param parentFolderId - Limit search to a specific folder (optional)
   * @returns Search results
   */
  async search(
    query: string,
    parentFolderId?: string
  ): Promise<GDriveSearchResult> {
    this.ensureInitialized();

    logger.info(`Searching Google Drive: ${query}`);

    try {
      // BEGINNER NOTE: Google Drive uses a special query syntax.
      // We search by name, and optionally filter by parent folder.
      let q = `name contains '${query}'`;

      if (parentFolderId) {
        q += ` and '${parentFolderId}' in parents`;
      }

      // Don't include trashed files
      q += ' and trashed = false';

      const response = await this.drive.files.list({
        q,
        fields: 'files(id, name, mimeType, parents)',
        pageSize: 100,
      });

      const files: GDriveItem[] = response.data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        parentId: file.parents?.[0],
      }));

      logger.info(`✅ Found ${files.length} files`);

      return {
        files,
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      logger.error(`❌ Search failed:`, error);
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List contents of a folder
   *
   * @param folderId - Folder ID to list
   * @returns List of items in the folder
   */
  async listFolder(folderId: string): Promise<GDriveItem[]> {
    this.ensureInitialized();

    logger.info(`Listing folder: ${folderId}`);

    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, parents)',
        pageSize: 100,
      });

      const files: GDriveItem[] = response.data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        parentId: file.parents?.[0],
      }));

      logger.info(`✅ Found ${files.length} items in folder`);

      return files;
    } catch (error) {
      logger.error(`❌ Failed to list folder:`, error);
      throw new Error(
        `Failed to list folder: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find or create a folder by path
   *
   * Creates the full folder hierarchy if it doesn't exist.
   *
   * @param path - Folder path (e.g., "Agent SDK/Learning Guides")
   * @returns Final folder ID
   */
  async ensureFolderPath(folderPath: string): Promise<string> {
    const parts = folderPath.split('/').filter((p) => p.trim());
    let currentFolderId: string | null = null;

    for (const folderName of parts) {
      logger.info(`Checking for folder: ${folderName}`);

      try {
        // Search for existing folder
        const searchResults = await this.search(
          folderName,
          currentFolderId || undefined
        );

        const existingFolder = searchResults.files.find(
          (f) =>
            f.name === folderName &&
            f.mimeType === 'application/vnd.google-apps.folder'
        );

        if (existingFolder) {
          logger.info(`Found existing folder: ${folderName} (${existingFolder.id})`);
          currentFolderId = existingFolder.id;
        } else {
          // Create new folder
          logger.info(`Creating new folder: ${folderName}`);
          currentFolderId = await this.createFolder(
            folderName,
            currentFolderId || undefined
          );
        }
      } catch (error) {
        logger.error(`Error processing folder ${folderName}:`, error);
        throw error;
      }
    }

    return currentFolderId || 'root';
  }
}

/**
 * Singleton instance
 */
let instance: GoogleDriveService | null = null;

/**
 * Get the Google Drive service instance
 *
 * BEGINNER NOTE: This creates a singleton - only one instance of the service
 * exists in the entire application. This ensures we reuse the same authenticated
 * client instead of creating new ones every time.
 */
export async function getGoogleDriveService(): Promise<GoogleDriveService> {
  if (!instance) {
    instance = new GoogleDriveService();
    await instance.initialize();
  }
  return instance;
}
