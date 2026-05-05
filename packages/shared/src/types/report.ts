import type { AnnotatedCitation } from './citation';

export type SectorTaxonomy = 'WICS' | 'GICS';
export type MarketScope = 'kr' | 'us';
export type ReportStatus = 'pending' | 'generating' | 'published' | 'failed';

export interface SectorScore {
  sectorCode: string;
  sectorNameKo: string;
  directionScore: number | null;
  citations: AnnotatedCitation[];
  rationaleAdvanced: string;
  rationaleNeutral?: string;
  rankTop?: number;
  rankBottom?: number;
}

export interface DailyReportPayload {
  reportDate: string;
  marketScope: MarketScope;
  taxonomy: SectorTaxonomy;
  publishedAt: string;
  scores: SectorScore[];
  top5: string[];
  bottom5: string[];
  marketSummary: {
    indices: Array<{ symbol: string; name: string; lastClose: number | null }>;
  };
  metadata: {
    unverifiedRatio: number;
    citationCount: number;
    llmProviderUsed: 'gemini' | 'cloudflare';
  };
}

export interface DailyReportEnvelope {
  id: string;
  reportDate: string;
  marketScope: MarketScope;
  status: ReportStatus;
  publishedAt: string | null;
  payload: DailyReportPayload | null;
}
