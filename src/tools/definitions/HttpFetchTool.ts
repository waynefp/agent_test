/**
 * HTTP Fetch Tool
 *
 * Makes HTTP requests to external APIs and web services.
 * Supports GET, POST, PUT, DELETE, PATCH with headers and body.
 *
 * BEGINNER NOTE: This tool uses native fetch() to make HTTP requests.
 * It's useful for calling APIs, fetching data, or interacting with web services.
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';

/**
 * Input schema for the HTTP Fetch tool
 * BEGINNER NOTE: Supports all common HTTP methods and configurations
 */
const HttpFetchInputSchema = z.object({
  url: z.string().url().describe('The URL to fetch'),
  method: z
    .enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
    .default('GET')
    .describe('HTTP method to use'),
  headers: z
    .record(z.string())
    .optional()
    .describe('HTTP headers to send (e.g., {"Authorization": "Bearer token"})'),
  body: z
    .union([z.string(), z.record(z.any())])
    .optional()
    .describe('Request body (string or JSON object)'),
  responseType: z
    .enum(['json', 'text', 'blob', 'arrayBuffer'])
    .default('json')
    .describe('Expected response type'),
  timeout: z.number().optional().describe('Request timeout in milliseconds (default: 30000)'),
  followRedirects: z.boolean().default(true).describe('Whether to follow redirects'),
});

type HttpFetchInput = z.infer<typeof HttpFetchInputSchema>;

/**
 * HTTP Fetch Tool Implementation
 * BEGINNER NOTE: Makes HTTP requests to external services
 */
export class HttpFetchTool extends BaseTool {
  readonly name = 'http_fetch';

  readonly description =
    'Makes HTTP requests to external URLs. Supports GET, POST, PUT, DELETE, PATCH methods ' +
    'with custom headers and request bodies. Can handle JSON, text, and binary responses. ' +
    'Use this tool when you need to call APIs, fetch data from URLs, or interact with web services.';

  readonly inputSchema = HttpFetchInputSchema;

  async execute(input: unknown, _options?: ToolExecutionOptions): Promise<ToolResult> {
    const {
      url,
      method,
      headers,
      body,
      responseType,
      timeout = 30000,
      followRedirects,
    } = input as HttpFetchInput;

    try {
      // Build fetch options
      const fetchOptions: RequestInit = {
        method,
        headers: this.buildHeaders(headers, body),
        redirect: followRedirects ? 'follow' : 'manual',
      };

      // Add body if provided and method supports it
      if (body && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      fetchOptions.signal = controller.signal;

      // Make the request
      const startTime = Date.now();
      let response: Response;

      try {
        response = await fetch(url, fetchOptions);
      } finally {
        clearTimeout(timeoutId);
      }

      const responseTime = Date.now() - startTime;

      // Parse response based on responseType
      let responseData: any;
      let responseText: string | undefined;

      try {
        switch (responseType) {
          case 'json':
            responseData = await response.json();
            break;
          case 'text':
            responseData = await response.text();
            responseText = responseData;
            break;
          case 'blob':
            responseData = await response.blob();
            break;
          case 'arrayBuffer':
            responseData = await response.arrayBuffer();
            break;
        }
      } catch (parseError) {
        // If parsing fails, try to get text
        responseText = await response.text();
        responseData = responseText;
      }

      // Build result
      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        metadata: {
          url,
          method,
          responseTime,
          responseType,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
        },
      };

      // For non-ok responses, include error info
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data: result,
          metadata: result.metadata,
        };
      }

      return {
        success: true,
        data: result,
        metadata: result.metadata,
      };
    } catch (error) {
      // Handle fetch errors
      if (error instanceof Error) {
        // Timeout error
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `Request timeout after ${timeout}ms`,
            metadata: {
              url,
              method,
              timeout,
            },
          };
        }

        // Network or other errors
        return {
          success: false,
          error: error.message,
          metadata: {
            url,
            method,
            errorType: error.name,
          },
        };
      }

      return {
        success: false,
        error: String(error),
        metadata: {
          url,
          method,
        },
      };
    }
  }

  /**
   * Build request headers
   * BEGINNER NOTE: Automatically sets Content-Type for JSON bodies
   */
  private buildHeaders(
    userHeaders?: Record<string, string>,
    body?: string | Record<string, any>
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'Agent-SDK/1.0',
      ...userHeaders,
    };

    // Auto-set Content-Type for JSON bodies
    if (body && typeof body === 'object' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }
}

/**
 * Factory function to create an HttpFetchTool
 */
export function createHttpFetchTool(): HttpFetchTool {
  return new HttpFetchTool();
}
