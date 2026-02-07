/**
 * Google Trends Tool
 *
 * Allows the agent to query Google Trends for search interest data.
 * Useful for validating market demand, tracking trends over time,
 * and discovering related search terms.
 *
 * BEGINNER NOTE: Google Trends shows how popular a search term is
 * over time. A score of 100 = peak popularity, 50 = half that peak.
 * It's relative, not absolute (doesn't show actual search counts).
 *
 * This tool is FREE - no API key required!
 *
 * Phase 15: Multi-Agent Patterns (Research Tools)
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';
import { logger } from '../../utils/logger.js';

/**
 * Input schema for the Google Trends tool
 *
 * BEGINNER NOTE: The agent can use two actions:
 * - "interestOverTime": How has interest changed over time?
 * - "relatedQueries": What else do people search for?
 */
const GoogleTrendsInputSchema = z.object({
  action: z.enum(['interestOverTime', 'relatedQueries']).describe(
    'The type of Google Trends data to fetch. "interestOverTime" shows how search interest changes over time. "relatedQueries" shows what related terms people also search for.'
  ),
  keywords: z.array(z.string().min(1)).min(1).max(5).describe(
    'Search terms to analyze (1-5 keywords). Examples: ["AI freelancer", "AI agent developer"]'
  ),
  timeRange: z.enum(['past_day', 'past_week', 'past_month', 'past_year', 'past_5_years']).default('past_year').optional().describe(
    'Time range for the data. Default is past_year.'
  ),
  geo: z.string().default('US').optional().describe(
    'Country code for regional data. Default is "US". Use "" for worldwide.'
  ),
});

type GoogleTrendsInput = z.infer<typeof GoogleTrendsInputSchema>;

/**
 * Map friendly time range names to Google Trends format
 * BEGINNER NOTE: Google Trends uses a specific date format internally.
 * We convert user-friendly names to those formats.
 */
function getStartTime(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case 'past_day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'past_week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'past_month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'past_year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'past_5_years':
      return new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Google Trends Tool Implementation
 */
export class GoogleTrendsTool extends BaseTool {
  readonly name = 'google_trends';

  readonly description = 'Query Google Trends for search interest data. Use this to validate market demand, track trends over time, and discover related search terms. FREE - no API key needed. Returns relative interest scores (0-100 scale, where 100 = peak popularity).';

  readonly inputSchema = GoogleTrendsInputSchema;

  /**
   * Execute a Google Trends query
   */
  async execute(input: unknown, _options?: ToolExecutionOptions): Promise<ToolResult> {
    const trendsInput = input as GoogleTrendsInput;

    try {
      // Dynamic import since google-trends-api is CommonJS
      const googleTrends = await import('google-trends-api');
      const api = googleTrends.default || googleTrends;

      const startTime = getStartTime(trendsInput.timeRange || 'past_year');
      const geo = trendsInput.geo || 'US';

      logger.info(
        `[GoogleTrends] ${trendsInput.action} for: ${trendsInput.keywords.join(', ')} (${trendsInput.timeRange || 'past_year'}, ${geo || 'worldwide'})`
      );

      if (trendsInput.action === 'interestOverTime') {
        return await this.getInterestOverTime(api, trendsInput.keywords, startTime, geo);
      } else if (trendsInput.action === 'relatedQueries') {
        return await this.getRelatedQueries(api, trendsInput.keywords, startTime, geo);
      }

      return {
        success: false,
        error: `Unknown action: ${trendsInput.action}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[GoogleTrends] Failed: ${errorMsg}`);

      return {
        success: false,
        error: `Google Trends query failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Get interest over time for keywords
   *
   * BEGINNER NOTE: Returns a timeline showing how popular each search
   * term has been. Scores are 0-100 relative to the peak.
   */
  private async getInterestOverTime(
    api: any,
    keywords: string[],
    startTime: Date,
    geo: string
  ): Promise<ToolResult> {
    try {
      const rawResult = await api.interestOverTime({
        keyword: keywords,
        startTime,
        geo: geo || undefined,
      });

      const parsed = JSON.parse(rawResult);
      const timelineData = parsed?.default?.timelineData || [];

      // Summarize the data instead of returning raw timeline
      // (raw timeline can be very large)
      const summary: Record<string, { current: number; average: number; peak: number; peakDate: string }> = {};

      for (const keyword of keywords) {
        const keyIndex = keywords.indexOf(keyword);
        let total = 0;
        let peak = 0;
        let peakDate = '';
        let current = 0;

        for (const point of timelineData) {
          const value = point.value?.[keyIndex] ?? 0;
          total += value;
          if (value > peak) {
            peak = value;
            peakDate = point.formattedTime || '';
          }
        }

        // Get the most recent data point as "current"
        if (timelineData.length > 0) {
          const lastPoint = timelineData[timelineData.length - 1];
          current = lastPoint.value?.[keyIndex] ?? 0;
        }

        summary[keyword] = {
          current,
          average: timelineData.length > 0 ? Math.round(total / timelineData.length) : 0,
          peak,
          peakDate,
        };
      }

      // Also get the trend direction (is it going up or down?)
      const trendDirection: Record<string, string> = {};
      for (const keyword of keywords) {
        const keyIndex = keywords.indexOf(keyword);
        if (timelineData.length >= 4) {
          const recentAvg =
            timelineData.slice(-3).reduce((sum: number, p: any) => sum + (p.value?.[keyIndex] ?? 0), 0) / 3;
          const olderAvg =
            timelineData.slice(-6, -3).reduce((sum: number, p: any) => sum + (p.value?.[keyIndex] ?? 0), 0) / 3;

          if (recentAvg > olderAvg * 1.1) {
            trendDirection[keyword] = 'RISING';
          } else if (recentAvg < olderAvg * 0.9) {
            trendDirection[keyword] = 'DECLINING';
          } else {
            trendDirection[keyword] = 'STABLE';
          }
        } else {
          trendDirection[keyword] = 'INSUFFICIENT_DATA';
        }
      }

      return {
        success: true,
        data: {
          type: 'interestOverTime',
          keywords,
          dataPoints: timelineData.length,
          summary,
          trendDirection,
          note: 'Scores are 0-100 where 100 = peak popularity for the time period. These are relative, not absolute search counts.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Interest over time query failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get related queries for keywords
   *
   * BEGINNER NOTE: Shows what else people search for when they search
   * for your keywords. Great for discovering niches and related terms.
   */
  private async getRelatedQueries(
    api: any,
    keywords: string[],
    startTime: Date,
    geo: string
  ): Promise<ToolResult> {
    try {
      const rawResult = await api.relatedQueries({
        keyword: keywords,
        startTime,
        geo: geo || undefined,
      });

      const parsed = JSON.parse(rawResult);
      const results: Record<string, { top: Array<{ query: string; value: number }>; rising: Array<{ query: string; value: string }> }> = {};

      for (const keyword of keywords) {
        const keyData = parsed?.default?.rankedList || [];
        const topQueries: Array<{ query: string; value: number }> = [];
        const risingQueries: Array<{ query: string; value: string }> = [];

        // Process ranked lists (alternates: top for keyword 1, rising for keyword 1, top for keyword 2, etc.)
        const keyIndex = keywords.indexOf(keyword);
        const topList = keyData[keyIndex * 2]?.rankedKeyword || [];
        const risingList = keyData[keyIndex * 2 + 1]?.rankedKeyword || [];

        for (const item of topList.slice(0, 10)) {
          topQueries.push({
            query: item.query,
            value: item.value,
          });
        }

        for (const item of risingList.slice(0, 10)) {
          risingQueries.push({
            query: item.query,
            value: item.formattedValue || String(item.value),
          });
        }

        results[keyword] = {
          top: topQueries,
          rising: risingQueries,
        };
      }

      return {
        success: true,
        data: {
          type: 'relatedQueries',
          keywords,
          results,
          note: 'Top queries are ranked by overall search volume. Rising queries are ranked by growth rate (e.g., "Breakout" = >5000% growth).',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Related queries lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

/**
 * Factory function
 */
export function createGoogleTrendsTool(): GoogleTrendsTool {
  return new GoogleTrendsTool();
}
