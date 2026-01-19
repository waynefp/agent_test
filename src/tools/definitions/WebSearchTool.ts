/**
 * Web Search Tool
 *
 * Allows the agent to search the web for information.
 * Uses the DuckDuckGo Instant Answer API (free, no API key needed).
 *
 * BEGINNER NOTE: This tool gives your agent access to current information
 * from the internet. It can answer questions about recent events,
 * look up facts, and find information it doesn't know.
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';

/**
 * Input schema for the web search tool
 */
const WebSearchInputSchema = z.object({
  query: z.string({
    description: 'The search query to look up',
  }).min(1, 'Query cannot be empty'),
  type: z.enum(['search', 'definition', 'answer'], {
    description: 'Type of search: search (general), definition (what is X), answer (quick fact)',
  }).optional().default('search'),
});

type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

/**
 * DuckDuckGo API response structure
 */
interface DuckDuckGoResponse {
  Abstract: string;
  AbstractText: string;
  AbstractSource: string;
  AbstractURL: string;
  Answer: string;
  AnswerType: string;
  Definition: string;
  DefinitionSource: string;
  DefinitionURL: string;
  Heading: string;
  Image: string;
  RelatedTopics: Array<{
    Text: string;
    FirstURL: string;
    Icon?: { URL: string };
  }>;
  Results: Array<{
    Text: string;
    FirstURL: string;
  }>;
  Type: string;
}

/**
 * Web Search Tool
 * BEGINNER NOTE: This tool lets the agent search the internet
 */
export class WebSearchTool extends BaseTool {
  readonly name = 'web_search';

  readonly description =
    'Searches the web for information using DuckDuckGo. ' +
    'Use this tool when you need to find current information, look up facts, ' +
    'get definitions, or answer questions about topics you\'re unsure about. ' +
    'Returns summaries, definitions, and related topics.';

  readonly inputSchema = WebSearchInputSchema;

  /**
   * Execute the web search
   */
  async execute(
    input: unknown,
    _options?: ToolExecutionOptions
  ): Promise<ToolResult> {
    const { query, type } = input as WebSearchInput;

    try {
      // Build the DuckDuckGo API URL
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

      // Fetch the results
      const response = await fetch(url);

      if (!response.ok) {
        return {
          success: false,
          error: `Search failed with status: ${response.status}`,
        };
      }

      const data = await response.json() as DuckDuckGoResponse;

      // Process results based on search type
      const result = this.processResults(data, type || 'search', query);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process DuckDuckGo results into a useful format
   */
  private processResults(
    data: DuckDuckGoResponse,
    type: string,
    query: string
  ): object {
    const result: {
      query: string;
      type: string;
      answer?: string;
      definition?: string;
      summary?: string;
      source?: string;
      url?: string;
      relatedTopics?: Array<{ text: string; url: string }>;
      noResults?: boolean;
      suggestion?: string;
    } = {
      query,
      type,
    };

    // Check for direct answer
    if (data.Answer) {
      result.answer = data.Answer;
    }

    // Check for definition
    if (data.Definition) {
      result.definition = data.Definition;
      result.source = data.DefinitionSource;
      result.url = data.DefinitionURL;
    }

    // Check for abstract/summary
    if (data.AbstractText) {
      result.summary = data.AbstractText;
      result.source = data.AbstractSource;
      result.url = data.AbstractURL;
    }

    // Check for related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      result.relatedTopics = data.RelatedTopics
        .filter(topic => topic.Text && topic.FirstURL)
        .slice(0, 5)
        .map(topic => ({
          text: topic.Text,
          url: topic.FirstURL,
        }));
    }

    // Check for direct results
    if (data.Results && data.Results.length > 0) {
      if (!result.relatedTopics) {
        result.relatedTopics = [];
      }
      data.Results.slice(0, 3).forEach(r => {
        result.relatedTopics!.push({
          text: r.Text,
          url: r.FirstURL,
        });
      });
    }

    // If no results found
    if (!result.answer && !result.definition && !result.summary &&
        (!result.relatedTopics || result.relatedTopics.length === 0)) {
      result.noResults = true;
      result.suggestion = `No instant answer found for "${query}". Try rephrasing the query or being more specific.`;
    }

    return result;
  }
}

/**
 * Factory function to create a WebSearchTool
 */
export function createWebSearchTool(): WebSearchTool {
  return new WebSearchTool();
}
