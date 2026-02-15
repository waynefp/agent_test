/**
 * Google Drive MCP Wrapper
 *
 * Wraps Google Drive MCP tool calls for the sync utility.
 * Uses piotr-agier/google-drive-mcp tools.
 *
 * BEGINNER NOTE: This wrapper abstracts the MCP tool calls so we can
 * easily update them if the tool names change or we switch MCP providers.
 */

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
 * Search result from Google Drive
 */
export interface GDriveSearchResult {
  files: GDriveItem[];
  nextPageToken?: string;
}

/**
 * Google Drive MCP Wrapper Class
 *
 * BEGINNER NOTE: This class provides a clean interface to the Google Drive MCP.
 * All MCP tool calls go through here, making it easy to update if needed.
 */
export class GDriveMCPWrapper {
  /**
   * Create a text file in Google Drive
   *
   * @param name - File name
   * @param content - File content
   * @param parentFolderId - Parent folder ID (optional, defaults to root)
   * @returns Created file ID
   */
  async createTextFile(
    name: string,
    content: string,
    parentFolderId?: string
  ): Promise<string> {
    logger.info(`Creating text file: ${name}`);

    // TODO: Call actual MCP tool once we discover the tool name
    // The tool will likely be named something like:
    // - mcp__google_drive__createTextFile
    // - mcp__gdrive__createTextFile
    // - createTextFile (if using direct MCP SDK)

    // For now, provide clear instructions
    throw new Error(
      `MCP Integration Needed:\n` +
        `Please create the file manually in Google Drive:\n` +
        `  Name: ${name}\n` +
        `  Folder: ${parentFolderId || 'root'}\n` +
        `  Content: [${content.length} characters]\n\n` +
        `Once we test this together, I'll implement the automatic upload.`
    );

    // When implemented, it will look like:
    // const result = await mcp_tool_call('createTextFile', {
    //   name,
    //   content,
    //   parentFolderId: parentFolderId || null
    // });
    // return result.id;
  }

  /**
   * Create a folder in Google Drive
   *
   * @param name - Folder name
   * @param parentFolderId - Parent folder ID (optional, defaults to root)
   * @returns Created folder ID
   */
  async createFolder(name: string, parentFolderId?: string): Promise<string> {
    logger.info(`Creating folder: ${name}`);

    // TODO: Implement MCP tool call
    throw new Error(
      `MCP Integration Needed:\n` +
        `Please create the folder manually:\n` +
        `  Name: ${name}\n` +
        `  Parent: ${parentFolderId || 'root'}`
    );

    // When implemented:
    // const result = await mcp_tool_call('createFolder', {
    //   name,
    //   parent: parentFolderId || null
    // });
    // return result.id;
  }

  /**
   * Search for files/folders in Google Drive
   *
   * @param query - Search query
   * @param parentFolderId - Limit search to a specific folder (optional)
   * @returns Search results
   */
  async search(
    query: string,
    parentFolderId?: string
  ): Promise<GDriveSearchResult> {
    logger.info(`Searching Google Drive: ${query}`);

    // TODO: Implement MCP tool call
    throw new Error(
      `MCP Integration Needed:\n` +
        `Please search manually for: ${query}\n` +
        `In folder: ${parentFolderId || 'all'}`
    );

    // When implemented:
    // const result = await mcp_tool_call('search', {
    //   query,
    //   parentId: parentFolderId
    // });
    // return result;
  }

  /**
   * List contents of a folder
   *
   * @param folderId - Folder ID to list
   * @returns List of items in the folder
   */
  async listFolder(folderId: string): Promise<GDriveItem[]> {
    logger.info(`Listing folder: ${folderId}`);

    // TODO: Implement MCP tool call
    throw new Error(
      `MCP Integration Needed:\n` + `Please list contents of folder: ${folderId}`
    );

    // When implemented:
    // const result = await mcp_tool_call('listFolder', {
    //   folderId
    // });
    // return result.files;
  }

  /**
   * Find or create a folder by path
   *
   * Creates the full folder hierarchy if it doesn't exist.
   *
   * @param path - Folder path (e.g., "Agent SDK/Learning Guides")
   * @returns Final folder ID
   */
  async ensureFolderPath(path: string): Promise<string> {
    const parts = path.split('/').filter((p) => p.trim());
    let currentFolderId: string | null = null;

    for (const folderName of parts) {
      logger.info(`Checking for folder: ${folderName}`);

      try {
        // Search for existing folder
        const searchResults = await this.search(folderName, currentFolderId || undefined);

        const existingFolder = searchResults.files.find(
          (f) => f.name === folderName && f.mimeType === 'application/vnd.google-apps.folder'
        );

        if (existingFolder) {
          logger.info(`Found existing folder: ${folderName} (${existingFolder.id})`);
          currentFolderId = existingFolder.id;
        } else {
          // Create new folder
          logger.info(`Creating new folder: ${folderName}`);
          currentFolderId = await this.createFolder(folderName, currentFolderId || undefined);
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
let instance: GDriveMCPWrapper | null = null;

/**
 * Get the Google Drive MCP wrapper instance
 */
export function getGDriveMCP(): GDriveMCPWrapper {
  if (!instance) {
    instance = new GDriveMCPWrapper();
  }
  return instance;
}
