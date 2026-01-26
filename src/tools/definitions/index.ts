/**
 * Tool Definitions - Central Export
 *
 * This file exports all available tools from one place.
 * BEGINNER NOTE: Makes importing tools easier elsewhere
 */

// Export base class
export { BaseTool } from './BaseTool.js';

// Export concrete tools
export { CalculatorTool, createCalculatorTool } from './CalculatorTool.js';
export { FileSystemTool, createFileSystemTool } from './FileSystemTool.js';
export { TaskTool, createTaskTool } from './TaskTool.js';

// Phase 10 tools
export { MemoryTool, createMemoryTool } from './MemoryTool.js';
export {
  WebSearchTool,
  createWebSearchTool,
  createMockWebSearchTool,
  type SearchProvider,
  type SearchResult,
  MockSearchProvider,
  DuckDuckGoProvider,
} from './WebSearchTool.js';
