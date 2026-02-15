/**
 * Google Drive Sync Utility
 *
 * Handles syncing local documents to Google Drive for easier access.
 * Converts .md files to .txt for Google Docs compatibility.
 *
 * BEGINNER NOTE: This uses the Google Drive API directly (via googleapis)
 * to upload documents to Google Drive automatically, so you can access
 * your learning materials, skills, and briefings from any device.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger.js';
import { getGoogleDriveService } from './gdrive-api-service.js';

/**
 * Folder structure in Google Drive
 * BEGINNER NOTE: We organize documents into folders for easy navigation
 */
const GDRIVE_FOLDERS = {
  ROOT: 'Agent SDK',
  LEARNING_GUIDES: 'Agent SDK/Learning Guides',
  SKILLS: 'Agent SDK/Skills',
  BRIEFINGS: 'Agent SDK/Briefings',
} as const;

/**
 * Document types we can sync
 */
export type SyncDocumentType = 'learning' | 'skills' | 'briefings' | 'all';

/**
 * Result from a sync operation
 */
export interface SyncResult {
  success: boolean;
  uploaded: string[];
  failed: string[];
  totalFiles: number;
  totalSize: number;
  errors: string[];
}

/**
 * Google Drive Sync Utility Class
 *
 * BEGINNER NOTE: This class handles all Google Drive operations.
 * It converts .md files to .txt (for Google Docs) and uploads them
 * with the proper folder structure.
 */
export class GoogleDriveSync {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Sync a single file to Google Drive
   *
   * @param localPath - Path to local file (relative to project root)
   * @param gdriveFolder - Google Drive folder path
   * @param fileName - Optional custom filename (defaults to original name)
   * @returns true if successful
   */
  async syncFile(
    localPath: string,
    gdriveFolder: string,
    fileName?: string
  ): Promise<boolean> {
    try {
      const fullPath = path.join(this.projectRoot, localPath);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        logger.warn(`File not found: ${localPath}`);
        return false;
      }

      // Read file content
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Convert .md to .txt for Google Docs compatibility
      const originalName = fileName || path.basename(localPath);
      const gdriveName = originalName.replace(/\.md$/, '.txt');

      logger.info(`Syncing ${localPath} to ${gdriveFolder}/${gdriveName}`);

      // Upload to Google Drive using MCP
      // BEGINNER NOTE: This calls the Google Drive MCP tool to upload the file
      await this.uploadToGDrive(content, gdriveFolder, gdriveName);

      logger.success(`✓ Synced: ${gdriveName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to sync ${localPath}:`, error);
      return false;
    }
  }

  /**
   * Sync all learning guides to Google Drive
   */
  async syncLearningGuides(): Promise<SyncResult> {
    logger.info('Syncing learning guides to Google Drive...');

    const learningDir = path.join(this.projectRoot, 'learning');
    const files = this.getMarkdownFiles(learningDir);

    const result: SyncResult = {
      success: true,
      uploaded: [],
      failed: [],
      totalFiles: files.length,
      totalSize: 0,
      errors: [],
    };

    for (const file of files) {
      const relativePath = path.relative(this.projectRoot, file);
      const success = await this.syncFile(
        relativePath,
        GDRIVE_FOLDERS.LEARNING_GUIDES
      );

      if (success) {
        result.uploaded.push(relativePath);
        result.totalSize += fs.statSync(file).size;
      } else {
        result.failed.push(relativePath);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Sync all skills to Google Drive
   */
  async syncSkills(): Promise<SyncResult> {
    logger.info('Syncing skills to Google Drive...');

    const skillsDir = path.join(this.projectRoot, '.claude', 'skills');
    const skillFiles: string[] = [];

    // Find all SKILL.md files in subdirectories
    if (fs.existsSync(skillsDir)) {
      const skillFolders = fs.readdirSync(skillsDir);
      for (const folder of skillFolders) {
        const skillFile = path.join(skillsDir, folder, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          skillFiles.push(skillFile);
        }
      }
    }

    const result: SyncResult = {
      success: true,
      uploaded: [],
      failed: [],
      totalFiles: skillFiles.length,
      totalSize: 0,
      errors: [],
    };

    for (const file of skillFiles) {
      const skillName = path.basename(path.dirname(file));
      const relativePath = path.relative(this.projectRoot, file);

      const success = await this.syncFile(
        relativePath,
        GDRIVE_FOLDERS.SKILLS,
        `${skillName}.txt` // e.g., "briefing.txt"
      );

      if (success) {
        result.uploaded.push(relativePath);
        result.totalSize += fs.statSync(file).size;
      } else {
        result.failed.push(relativePath);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Sync all briefings to Google Drive
   *
   * BEGINNER NOTE: This looks for .txt files in the briefings output folder
   * (if it exists) and uploads them to Google Drive.
   */
  async syncBriefings(): Promise<SyncResult> {
    logger.info('Syncing briefings to Google Drive...');

    // Check if briefings output folder exists
    const briefingsDir = path.join(this.projectRoot, 'output', 'briefings');

    const result: SyncResult = {
      success: true,
      uploaded: [],
      failed: [],
      totalFiles: 0,
      totalSize: 0,
      errors: [],
    };

    if (!fs.existsSync(briefingsDir)) {
      logger.info('No briefings folder found - skipping');
      return result;
    }

    const files = fs
      .readdirSync(briefingsDir)
      .filter((f) => f.endsWith('.txt') || f.endsWith('.md'))
      .map((f) => path.join(briefingsDir, f));

    result.totalFiles = files.length;

    for (const file of files) {
      const relativePath = path.relative(this.projectRoot, file);
      const success = await this.syncFile(relativePath, GDRIVE_FOLDERS.BRIEFINGS);

      if (success) {
        result.uploaded.push(relativePath);
        result.totalSize += fs.statSync(file).size;
      } else {
        result.failed.push(relativePath);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Sync all documents to Google Drive
   */
  async syncAll(): Promise<SyncResult> {
    logger.info('Syncing all documents to Google Drive...');

    const learningResult = await this.syncLearningGuides();
    const skillsResult = await this.syncSkills();
    const briefingsResult = await this.syncBriefings();

    // Combine results
    const combinedResult: SyncResult = {
      success:
        learningResult.success && skillsResult.success && briefingsResult.success,
      uploaded: [
        ...learningResult.uploaded,
        ...skillsResult.uploaded,
        ...briefingsResult.uploaded,
      ],
      failed: [
        ...learningResult.failed,
        ...skillsResult.failed,
        ...briefingsResult.failed,
      ],
      totalFiles:
        learningResult.totalFiles +
        skillsResult.totalFiles +
        briefingsResult.totalFiles,
      totalSize:
        learningResult.totalSize +
        skillsResult.totalSize +
        briefingsResult.totalSize,
      errors: [
        ...learningResult.errors,
        ...skillsResult.errors,
        ...briefingsResult.errors,
      ],
    };

    return combinedResult;
  }

  /**
   * Upload content to Google Drive
   *
   * BEGINNER NOTE: This is where we actually call the Google Drive API.
   * We use the googleapis package to authenticate and upload files.
   *
   * Uses Google Drive API v3:
   * - createTextFile: Creates a text file in Google Drive
   * - ensureFolderPath: Creates folders if they don't exist
   *
   * @param content - File content to upload
   * @param folderPath - Google Drive folder path (e.g., "Agent SDK/Learning Guides")
   * @param fileName - Name of the file in Google Drive
   */
  private async uploadToGDrive(
    content: string,
    folderPath: string,
    fileName: string
  ): Promise<void> {
    try {
      const gdrive = await getGoogleDriveService();

      // Ensure the folder structure exists
      logger.debug(`Ensuring folder exists: ${folderPath}`);
      const folderId = await gdrive.ensureFolderPath(folderPath);

      // Create the text file in Google Drive
      // BEGINNER NOTE: This uses the Google Drive API to upload the file
      logger.debug(`Uploading ${fileName} to folder ID: ${folderId}`);

      await gdrive.createTextFile(fileName, content, folderId);

      logger.debug(`Successfully uploaded: ${folderPath}/${fileName}`);
    } catch (error) {
      logger.error(`Failed to upload ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Get all markdown files in a directory (recursively)
   */
  private getMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.getMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Get total size of files to sync (for progress reporting)
   */
  async getTotalSize(type: SyncDocumentType): Promise<number> {
    let totalSize = 0;

    switch (type) {
      case 'learning': {
        const learningDir = path.join(this.projectRoot, 'learning');
        const files = this.getMarkdownFiles(learningDir);
        for (const file of files) {
          totalSize += fs.statSync(file).size;
        }
        break;
      }
      case 'skills': {
        const skillsDir = path.join(this.projectRoot, '.claude', 'skills');
        if (fs.existsSync(skillsDir)) {
          const skillFolders = fs.readdirSync(skillsDir);
          for (const folder of skillFolders) {
            const skillFile = path.join(skillsDir, folder, 'SKILL.md');
            if (fs.existsSync(skillFile)) {
              totalSize += fs.statSync(skillFile).size;
            }
          }
        }
        break;
      }
      case 'briefings': {
        const briefingsDir = path.join(this.projectRoot, 'output', 'briefings');
        if (fs.existsSync(briefingsDir)) {
          const files = fs
            .readdirSync(briefingsDir)
            .filter((f) => f.endsWith('.txt') || f.endsWith('.md'));
          for (const file of files) {
            totalSize += fs.statSync(path.join(briefingsDir, file)).size;
          }
        }
        break;
      }
      case 'all': {
        totalSize += await this.getTotalSize('learning');
        totalSize += await this.getTotalSize('skills');
        totalSize += await this.getTotalSize('briefings');
        break;
      }
    }

    return totalSize;
  }
}

/**
 * Factory function to create a GoogleDriveSync instance
 */
export function createGoogleDriveSync(projectRoot: string): GoogleDriveSync {
  return new GoogleDriveSync(projectRoot);
}
