/**
 * Type declarations for google-trends-api
 *
 * BEGINNER NOTE: Some npm packages don't include TypeScript types.
 * We create a "declaration file" (.d.ts) to tell TypeScript what
 * the module exports. This is common with older JavaScript packages.
 */
declare module 'google-trends-api' {
  interface TrendsOptions {
    keyword: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string;
    hl?: string;
    category?: number;
    property?: string;
    resolution?: string;
  }

  interface GoogleTrendsApi {
    autoComplete(options: TrendsOptions): Promise<string>;
    dailyTrends(options: TrendsOptions): Promise<string>;
    interestByRegion(options: TrendsOptions): Promise<string>;
    interestOverTime(options: TrendsOptions): Promise<string>;
    realTimeTrends(options: TrendsOptions): Promise<string>;
    relatedQueries(options: TrendsOptions): Promise<string>;
    relatedTopics(options: TrendsOptions): Promise<string>;
  }

  const api: GoogleTrendsApi;
  export default api;
}
