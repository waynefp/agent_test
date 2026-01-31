/**
 * Image Utilities
 *
 * Functions for loading, encoding, and validating images for vision.
 *
 * BEGINNER NOTE: Claude can process images! But they need to be sent
 * as base64-encoded data. This module handles all the image processing.
 *
 * Phase 12: Vision & Multi-modal
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger.js';
import type { ImageMediaType, ImageContent } from '../types/conversation.types.js';
import { createImageContent } from '../types/conversation.types.js';

/**
 * Result of loading an image
 */
export interface LoadedImage {
  /** Base64-encoded image data */
  data: string;
  /** MIME type of the image */
  mediaType: ImageMediaType;
  /** Original source (file path or URL) */
  source: string;
  /** File size in bytes */
  sizeBytes: number;
}

/**
 * Supported image extensions and their media types
 */
const EXTENSION_TO_MEDIA_TYPE: Record<string, ImageMediaType> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Maximum image size (20MB - Anthropic's limit)
 */
const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * Detect image media type from file content (magic bytes)
 * BEGINNER NOTE: Files have "magic bytes" at the start that identify their true format.
 * This is more reliable than file extensions which can be wrong.
 *
 * @param buffer - The file buffer
 * @returns The detected media type or null if unknown
 */
function detectMediaTypeFromBuffer(buffer: Buffer): ImageMediaType | null {
  if (buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // GIF: 47 49 46 38 ("GIF8")
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return 'image/gif';
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Get the media type from a file extension
 * BEGINNER NOTE: Determines the image format from the filename
 *
 * @param filePath - Path to the image file
 * @returns The media type or null if unsupported
 */
export function getMediaTypeFromPath(filePath: string): ImageMediaType | null {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_MEDIA_TYPE[ext] || null;
}

/**
 * Check if a file extension is a supported image type
 */
export function isSupportedImageType(filePath: string): boolean {
  return getMediaTypeFromPath(filePath) !== null;
}

/**
 * Get supported image extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(EXTENSION_TO_MEDIA_TYPE);
}

/**
 * Validate image size
 * BEGINNER NOTE: Images larger than 20MB will be rejected by the API
 *
 * @param sizeBytes - Size of the image in bytes
 * @returns true if valid, false if too large
 */
export function isValidImageSize(sizeBytes: number): boolean {
  return sizeBytes <= MAX_IMAGE_SIZE_BYTES;
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Load an image from a file path
 * BEGINNER NOTE: Reads an image file and converts it to base64
 *
 * @param filePath - Path to the image file
 * @returns LoadedImage with base64 data
 * @throws Error if file doesn't exist, is unsupported, or is too large
 */
export async function loadImageFromFile(filePath: string): Promise<LoadedImage> {
  // Resolve to absolute path
  const absolutePath = path.resolve(filePath);

  logger.debug(`Loading image from: ${absolutePath}`);

  // Check if file exists
  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`Image file not found: ${absolutePath}`);
  }

  // Read file first so we can detect actual format
  const buffer = await fs.readFile(absolutePath);
  const sizeBytes = buffer.length;

  // Detect actual media type from file content (magic bytes)
  // This is more reliable than file extension
  let mediaType = detectMediaTypeFromBuffer(buffer);

  // Fall back to extension if magic bytes don't match
  if (!mediaType) {
    mediaType = getMediaTypeFromPath(absolutePath);
  }

  if (!mediaType) {
    const supported = getSupportedExtensions().join(', ');
    throw new Error(`Unsupported image type. Supported: ${supported}`);
  }

  // Log if extension doesn't match actual format
  const extensionType = getMediaTypeFromPath(absolutePath);
  if (extensionType && extensionType !== mediaType) {
    logger.warn(
      `File extension suggests ${extensionType} but actual format is ${mediaType}. Using detected format.`
    );
  }

  // Check size
  if (!isValidImageSize(sizeBytes)) {
    throw new Error(
      `Image too large (${formatFileSize(sizeBytes)}). Maximum: ${formatFileSize(MAX_IMAGE_SIZE_BYTES)}`
    );
  }

  // Convert to base64
  const data = buffer.toString('base64');

  logger.info(`Loaded image: ${path.basename(absolutePath)} (${formatFileSize(sizeBytes)})`);

  return {
    data,
    mediaType,
    source: absolutePath,
    sizeBytes,
  };
}

/**
 * Load an image from a URL
 * BEGINNER NOTE: Downloads an image from the internet and converts to base64
 *
 * @param url - URL of the image
 * @returns LoadedImage with base64 data
 * @throws Error if download fails or image is invalid
 */
export async function loadImageFromUrl(url: string): Promise<LoadedImage> {
  logger.debug(`Loading image from URL: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Get content type from headers
    const contentType = response.headers.get('content-type');
    let mediaType: ImageMediaType;

    if (contentType?.includes('image/jpeg') || contentType?.includes('image/jpg')) {
      mediaType = 'image/jpeg';
    } else if (contentType?.includes('image/png')) {
      mediaType = 'image/png';
    } else if (contentType?.includes('image/gif')) {
      mediaType = 'image/gif';
    } else if (contentType?.includes('image/webp')) {
      mediaType = 'image/webp';
    } else {
      // Try to infer from URL
      const urlMediaType = getMediaTypeFromPath(new URL(url).pathname);
      if (urlMediaType) {
        mediaType = urlMediaType;
      } else {
        throw new Error(`Unsupported image type: ${contentType || 'unknown'}`);
      }
    }

    // Get image data
    const buffer = await response.arrayBuffer();
    const sizeBytes = buffer.byteLength;

    // Check size
    if (!isValidImageSize(sizeBytes)) {
      throw new Error(
        `Image too large (${formatFileSize(sizeBytes)}). Maximum: ${formatFileSize(MAX_IMAGE_SIZE_BYTES)}`
      );
    }

    // Convert to base64
    const data = Buffer.from(buffer).toString('base64');

    logger.info(`Loaded image from URL (${formatFileSize(sizeBytes)})`);

    return {
      data,
      mediaType,
      source: url,
      sizeBytes,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Failed to fetch')) {
      throw error;
    }
    throw new Error(`Failed to load image from URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load an image from either a file path or URL
 * BEGINNER NOTE: Automatically detects whether the source is a file or URL
 *
 * @param source - File path or URL
 * @returns LoadedImage with base64 data
 */
export async function loadImage(source: string): Promise<LoadedImage> {
  // Check if it's a URL
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return loadImageFromUrl(source);
  }

  // Treat as file path
  return loadImageFromFile(source);
}

/**
 * Convert a LoadedImage to an ImageContent block
 * BEGINNER NOTE: Creates the content block format Claude expects
 *
 * @param image - The loaded image
 * @returns ImageContent ready to add to a message
 */
export function toImageContent(image: LoadedImage): ImageContent {
  return createImageContent(image.data, image.mediaType);
}

/**
 * Load an image and convert directly to ImageContent
 * BEGINNER NOTE: Convenience function that combines loading and conversion
 *
 * @param source - File path or URL
 * @returns ImageContent ready to add to a message
 */
export async function loadImageAsContent(source: string): Promise<ImageContent> {
  const image = await loadImage(source);
  return toImageContent(image);
}

/**
 * Estimate the token cost of an image
 * BEGINNER NOTE: Images cost tokens! Larger images = more tokens.
 * This is a rough estimate based on Anthropic's documentation.
 *
 * Anthropic charges based on image size:
 * - Images are resized to fit within 1568x1568 while maintaining aspect ratio
 * - Tokens ≈ (width * height) / 750
 *
 * Since we don't know the actual dimensions, we estimate based on file size.
 * A rough heuristic: ~1 token per 100 bytes of base64 data
 *
 * @param image - The loaded image
 * @returns Estimated token count
 */
export function estimateImageTokens(image: LoadedImage): number {
  // Very rough estimate - actual cost depends on image dimensions
  // Base64 is ~33% larger than raw, so adjust for that
  const rawSize = image.sizeBytes * 0.75;

  // Rough estimate: larger images cost more, but there's a max due to resizing
  // Most images end up costing 1000-2000 tokens
  const estimate = Math.min(Math.ceil(rawSize / 500), 2000);

  return Math.max(estimate, 85); // Minimum ~85 tokens for smallest images
}
