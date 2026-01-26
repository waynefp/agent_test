/**
 * Web Search Tool
 *
 * Allows the agent to search the web for information.
 * Uses a provider abstraction so different search APIs can be used.
 *
 * BEGINNER NOTE: This tool gives the agent access to current information
 * from the internet. The agent's knowledge has a cutoff date, so web
 * search is essential for current events, prices, weather, etc.
 *
 * Phase 10: Memory & Web Search
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';
import { logger } from '../../utils/logger.js';

/**
 * A single search result
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

/**
 * Search provider interface
 * BEGINNER NOTE: This abstraction lets us swap search providers easily
 */
export interface SearchProvider {
  name: string;
  search(query: string, maxResults?: number): Promise<SearchResult[]>;
}

/**
 * Input schema for the web search tool
 */
const WebSearchInputSchema = z.object({
  query: z.string().min(1).describe(
    'The search query to look up on the web'
  ),
  maxResults: z.number().min(1).max(10).default(5).optional().describe(
    'Maximum number of results to return (1-10, default 5)'
  ),
});

type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

/**
 * Mock Search Provider - For testing without an API
 * BEGINNER NOTE: This returns fake results for testing. Replace with
 * a real provider for actual web search.
 */
export class MockSearchProvider implements SearchProvider {
  name = 'mock';

  async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return mock results based on query
    const results: SearchResult[] = [
      {
        title: `Information about: ${query}`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `This is a mock search result for "${query}". In a real implementation, this would contain actual search results from the web.`,
        source: 'example.com',
      },
      {
        title: `${query} - Wikipedia`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/ /g, '_'))}`,
        snippet: `Wikipedia article about ${query}. This is simulated content for testing purposes.`,
        source: 'wikipedia.org',
      },
      {
        title: `Latest news on ${query}`,
        url: `https://news.example.com/${encodeURIComponent(query)}`,
        snippet: `Recent developments and news related to ${query}. Mock content for demonstration.`,
        source: 'news.example.com',
      },
    ];

    return results.slice(0, maxResults);
  }
}

/**
 * DuckDuckGo Instant Answer Provider
 * BEGINNER NOTE: Uses DuckDuckGo's free instant answer API
 * Limited but doesn't require an API key
 */
/**
 * DuckDuckGo API response type
 */
interface DuckDuckGoResponse {
  Abstract?: string;
  Heading?: string;
  AbstractURL?: string;
  AbstractSource?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
  }>;
}

export class DuckDuckGoProvider implements SearchProvider {
  name = 'duckduckgo';

  async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }

      const data = await response.json() as DuckDuckGoResponse;
      const results: SearchResult[] = [];

      // Abstract (main result)
      if (data.Abstract) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || '',
          snippet: data.Abstract,
          source: data.AbstractSource || 'DuckDuckGo',
        });
      }

      // Related topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (results.length >= maxResults) break;

          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 50),
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo',
            });
          }
        }
      }

      // If no results, return a helpful message
      if (results.length === 0) {
        results.push({
          title: `No instant answers for: ${query}`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: `DuckDuckGo didn't have instant answers for this query. Try searching directly at the URL.`,
          source: 'DuckDuckGo',
        });
      }

      return results.slice(0, maxResults);
    } catch (error) {
      logger.error('DuckDuckGo search failed:', error);
      throw error;
    }
  }
}

/**
 * Web Search Tool Implementation
 */
export class WebSearchTool extends BaseTool {
  private provider: SearchProvider;

  readonly name = 'web_search';

  readonly inputSchema = WebSearchInputSchema;

  get description(): string {
    return `Search the web for current information. Use this when you need up-to-date information, facts you're unsure about, current events, prices, weather, or anything that might have changed since your knowledge cutoff. Provider: ${this.provider.name}`;
  }

  constructor(provider?: SearchProvider) {
    super();
    // Default to DuckDuckGo, fall back to mock if needed
    this.provider = provider || new DuckDuckGoProvider();
  }

  /**
   * Execute web search
   */
  async execute(input: unknown, _options?: ToolExecutionOptions): Promise<ToolResult> {
    const searchInput = input as WebSearchInput;
    try {
      const maxResults = searchInput.maxResults || 5;

      logger.info(`Searching web for: "${searchInput.query}" (max ${maxResults} results)`);

      const results = await this.provider.search(searchInput.query, maxResults);

      if (results.length === 0) {
        return {
          success: true,
          data: {
            query: searchInput.query,
            resultCount: 0,
            message: 'No results found for this query',
            results: [],
          },
        };
      }

      return {
        success: true,
        data: {
          query: searchInput.query,
          resultCount: results.length,
          provider: this.provider.name,
          results: results.map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            source: r.source,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Web search failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get the current provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Set a different search provider
   */
  setProvider(provider: SearchProvider): void {
    this.provider = provider;
    logger.info(`Web search provider changed to: ${provider.name}`);
  }
}

/**
 * Factory function
 */
export function createWebSearchTool(provider?: SearchProvider): WebSearchTool {
  return new WebSearchTool(provider);
}

/**
 * Create a mock web search tool for testing
 */
export function createMockWebSearchTool(): WebSearchTool {
  return new WebSearchTool(new MockSearchProvider());
}
