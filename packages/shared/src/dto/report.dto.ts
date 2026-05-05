import { z } from 'zod';

export const MarketScopeSchema = z.enum(['kr', 'us']);
export const SectorTaxonomySchema = z.enum(['WICS', 'GICS']);
export const CitationTierSchema = z.enum(['verified', 'community', 'unverified']);

export const AnnotatedCitationSchema = z.object({
  url: z.string().url(),
  quote: z.string().min(1),
  tier: CitationTierSchema,
  sourceCode: z.string().optional(),
  publishedAt: z.string().optional(),
  reason: z
    .enum(['not_in_corpus', 'http_404', 'community_source', 'verified_in_corpus'])
    .optional(),
});

export const SectorScoreSchema = z.object({
  sectorCode: z.string(),
  sectorNameKo: z.string(),
  directionScore: z.number().int().min(-5).max(5).nullable(),
  citations: z.array(AnnotatedCitationSchema),
  rationaleAdvanced: z.string(),
  rationaleNeutral: z.string().optional(),
  rankTop: z.number().int().optional(),
  rankBottom: z.number().int().optional(),
});

export const DailyReportPayloadSchema = z.object({
  reportDate: z.string(),
  marketScope: MarketScopeSchema,
  taxonomy: SectorTaxonomySchema,
  publishedAt: z.string(),
  scores: z.array(SectorScoreSchema),
  top5: z.array(z.string()),
  bottom5: z.array(z.string()),
  marketSummary: z.object({
    indices: z.array(
      z.object({
        symbol: z.string(),
        name: z.string(),
        lastClose: z.number().nullable(),
      }),
    ),
  }),
  metadata: z.object({
    unverifiedRatio: z.number().min(0).max(1),
    citationCount: z.number().int().min(0),
    llmProviderUsed: z.enum(['gemini']),
  }),
});

export type DailyReportPayloadDto = z.infer<typeof DailyReportPayloadSchema>;

/**
 * LLM 응답 검증 스키마 (V1).
 * AnalysisModule이 Gemini 응답을 이걸로 강제 파싱한다.
 */
export const LlmAnalysisResponseSchema = z.object({
  scores: z.array(
    z.object({
      sector_code: z.string(),
      direction_score: z.number().int().min(-5).max(5),
      rationale: z.string().min(1),
      cited_ids: z.array(z.string().min(1)).min(1),
    }),
  ),
});

export type LlmAnalysisResponseDto = z.infer<typeof LlmAnalysisResponseSchema>;
