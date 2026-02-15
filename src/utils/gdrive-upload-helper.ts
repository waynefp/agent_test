/**
 * Google Drive Upload Helper
 *
 * Helper to execute Google Drive uploads through Claude's MCP integration.
 * Since MCP tools are available to Claude but not directly from TypeScript,
 * this helper prepares upload requests that Claude can execute.
 *
 * BEGINNER NOTE: MCP tools run in Claude's context, not in Node.js.
 * This helper acts as a bridge between the sync utility and Claude.
 */

import { logger } from './logger.js';

/**
 * Upload request for Google Drive
 */
export interface GDriveUploadRequest {
  fileName: string;
  folderPath: string;
  content: string;
  size: number;
}

/**
 * Batch upload request
 */
export interface GDriveBatchUpload {
  files: GDriveUploadRequest[];
  totalSize: number;
  totalFiles: number;
}

/**
 * Prepare files for Google Drive upload
 *
 * BEGINNER NOTE: This doesn't actually upload - it prepares the data
 * so Claude can execute the uploads using MCP tools.
 */
export class GDriveUploadHelper {
  private pendingUploads: GDriveUploadRequest[] = [];

  /**
   * Add a file to the upload queue
   */
  addFile(fileName: string, folderPath: string, content: string): void {
    this.pendingUploads.push({
      fileName,
      folderPath,
      content,
      size: content.length,
    });

    logger.debug(`Queued for upload: ${folderPath}/${fileName} (${content.length} bytes)`);
  }

  /**
   * Get pending uploads
   */
  getPendingUploads(): GDriveBatchUpload {
    return {
      files: [...this.pendingUploads],
      totalFiles: this.pendingUploads.length,
      totalSize: this.pendingUploads.reduce((sum, f) => sum + f.size, 0),
    };
  }

  /**
   * Clear pending uploads
   */
  clearPending(): void {
    this.pendingUploads = [];
  }

  /**
   * Generate upload instructions for Claude
   */
  generateUploadInstructions(): string {
    if (this.pendingUploads.length === 0) {
      return 'No files queued for upload.';
    }

    const instructions = [
      `\n${'='.repeat(60)}`,
      `Google Drive Upload Instructions`,
      `${'='.repeat(60)}`,
      ``,
      `Files to upload: ${this.pendingUploads.length}`,
      `Total size: ${(this.getTotalSize() / 1024).toFixed(2)} KB`,
      ``,
      `Please create the following folder structure and files:`,
      ``,
    ];

    // Group by folder
    const byFolder = new Map<string, GDriveUploadRequest[]>();
    for (const file of this.pendingUploads) {
      if (!byFolder.has(file.folderPath)) {
        byFolder.set(file.folderPath, []);
      }
      byFolder.get(file.folderPath)!.push(file);
    }

    // Generate instructions per folder
    for (const [folderPath, files] of byFolder) {
      instructions.push(`📁 Folder: "${folderPath}"`);
      instructions.push('');

      for (const file of files) {
        instructions.push(`  📄 File: "${file.fileName}"`);
        instructions.push(`     Size: ${(file.size / 1024).toFixed(2)} KB`);
        instructions.push(`     Content preview: ${file.content.substring(0, 100)}...`);
        instructions.push('');
      }
    }

    instructions.push('='.repeat(60));
    instructions.push('');

    return instructions.join('\n');
  }

  /**
   * Get total size of pending uploads
   */
  private getTotalSize(): number {
    return this.pendingUploads.reduce((sum, f) => sum + f.size, 0);
  }
}

/**
 * Singleton instance
 */
let uploadHelper: GDriveUploadHelper | null = null;

/**
 * Get the upload helper instance
 */
export function getUploadHelper(): GDriveUploadHelper {
  if (!uploadHelper) {
    uploadHelper = new GDriveUploadHelper();
  }
  return uploadHelper;
}
