export type SourceRegion = 'kr' | 'us' | 'global';
export type SourceType = 'news' | 'filing';
export type SourceTrustTier = 'verified' | 'community' | 'unverified';

export interface NewsSource {
  code: string;
  displayName: string;
  region: SourceRegion;
  sourceType: SourceType;
  trustTier: SourceTrustTier;
  rssUrl: string | null;
}

export interface NormalizedArticle {
  externalId: string;
  url: string;
  title: string;
  summary: string;
  publishedAt: Date;
  language: 'ko' | 'en';
  sectorTags?: string[];
}

export interface IngestionRunSummary {
  sourceCode: string;
  status: 'running' | 'success' | 'partial' | 'failed';
  insertedCount: number;
  skippedCount: number;
  errorCount: number;
  errorSummary?: string;
  startedAt: Date;
  finishedAt?: Date;
}
