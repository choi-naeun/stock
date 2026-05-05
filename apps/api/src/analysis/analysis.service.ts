import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AnnotatedCitation,
  MarketScope,
  RawCitation,
  SectorScore,
  SectorTaxonomy,
} from '@stock-tracker/shared';
import { LlmAnalysisResponseSchema } from '@stock-tracker/shared';

import { CitationService } from '../citation/citation.service';
import { LlmProviderService } from '../llm-provider/llm-provider.service';
import { SectorTaxonomyService } from '../sector-taxonomy/sector-taxonomy.service';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { buildAnalysisPrompt, type ArticleInput } from './prompt-builder';
import { applySafetyFilter, containsForbidden } from './safety-filter';

interface ArticleRow {
  url: string;
  source_code: string;
  title: string;
  summary: string | null;
  published_at: string;
  language: 'ko' | 'en';
  sector_tags: string[];
  news_sources_trust_tier?: 'verified' | 'community' | 'unverified';
}

export interface SectorAnalysisResult {
  taxonomy: SectorTaxonomy;
  scores: SectorScore[];
  top5: string[];
  bottom5: string[];
  llmProviderUsed: 'gemini';
  unverifiedRatio: number;
  citationCount: number;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly maxArticlesInPrompt = 60;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly llm: LlmProviderService,
    private readonly citation: CitationService,
    private readonly taxonomy: SectorTaxonomyService,
  ) {}

  async analyzeMarket(scope: MarketScope, date: Date): Promise<SectorAnalysisResult> {
    const taxonomy = this.taxonomy.taxonomyForScope(scope);
    const sectors = this.taxonomy.list(taxonomy);
    const articles = await this.loadRecentArticles(scope, date);

    if (articles.length === 0) {
      throw new Error(`No articles available for ${scope} ${date.toISOString().slice(0, 10)}`);
    }

    const articleInputs = this.toArticleInputs(articles);
    const prompt = buildAnalysisPrompt({
      scope,
      date,
      taxonomy,
      sectors,
      articles: articleInputs,
    });

    const llmOptions = {
      systemPrompt: prompt.system,
      maxTokens: 16384,
      responseMimeType: 'application/json' as const,
      responseSchema: ANALYSIS_RESPONSE_SCHEMA,
    };

    let result = await this.llm.generate(prompt.user, {
      ...llmOptions,
      temperature: 0.2,
    });

    let parsed = this.parseResponse(result.text);
    if (!parsed) {
      this.dumpRawForDebug(result.text, '1st');
      this.logger.warn('First LLM response unparseable; retrying once at temperature=0');
      result = await this.llm.generate(prompt.user, {
        ...llmOptions,
        temperature: 0,
      });
      parsed = this.parseResponse(result.text);
      if (!parsed) {
        this.dumpRawForDebug(result.text, '2nd');
        throw new Error('LLM returned invalid JSON twice');
      }
    }

    const articleIdSet = new Set(articleInputs.map((a) => a.id));
    const articleByIdUrl = new Map(articleInputs.map((a) => [a.id, a]));
    const validCodes = new Set(this.taxonomy.validCodes(taxonomy));

    const candidateScores: SectorScore[] = [];
    let totalCitations = 0;
    let unverifiedCitations = 0;

    for (const item of parsed.scores) {
      if (!validCodes.has(item.sector_code)) continue;

      // 입력에 없던 cited_ids는 환각으로 간주, 제거
      const knownIds = item.cited_ids.filter((id) => articleIdSet.has(id));
      if (knownIds.length === 0) continue;

      const rawCitations: RawCitation[] = knownIds
        .map((id) => articleByIdUrl.get(id))
        .filter((a): a is ArticleInput => Boolean(a))
        .map((a) => ({ url: a.url, quote: a.title }));

      const annotated = await this.citation.annotate(rawCitations);
      const verifiedOrCommunity = annotated.filter(
        (c) => c.tier === 'verified' || c.tier === 'community',
      );

      const sectorNameKo = this.taxonomy.resolveName(taxonomy, item.sector_code);
      let directionScore: number | null = item.direction_score;
      let rationale = applySafetyFilter(item.rationale);
      if (containsForbidden(rationale)) {
        rationale = '본 섹터에 대해 안전한 관점 제시가 불가하여 보류합니다.';
        directionScore = null;
      }

      // F4 핵심: Verified+Community 합 < 3 → score=null + 근거 불충분 표시
      if (verifiedOrCommunity.length < 3) {
        directionScore = null;
      }

      candidateScores.push({
        sectorCode: item.sector_code,
        sectorNameKo,
        directionScore,
        citations: annotated,
        rationaleAdvanced: rationale,
      });

      totalCitations += annotated.length;
      unverifiedCitations += annotated.filter((c) => c.tier === 'unverified').length;
    }

    // Top5/Bottom5: directionScore 기준 정렬, null 제외
    const ranked = candidateScores
      .filter((s): s is SectorScore & { directionScore: number } => s.directionScore !== null);
    const top5 = [...ranked].sort((a, b) => b.directionScore - a.directionScore).slice(0, 5);
    const bottom5 = [...ranked].sort((a, b) => a.directionScore - b.directionScore).slice(0, 5);

    for (let i = 0; i < top5.length; i++) {
      const found = candidateScores.find((s) => s.sectorCode === top5[i]!.sectorCode);
      if (found) found.rankTop = i + 1;
    }
    for (let i = 0; i < bottom5.length; i++) {
      const found = candidateScores.find((s) => s.sectorCode === bottom5[i]!.sectorCode);
      if (found) found.rankBottom = i + 1;
    }

    return {
      taxonomy,
      scores: candidateScores,
      top5: top5.map((s) => s.sectorCode),
      bottom5: bottom5.map((s) => s.sectorCode),
      llmProviderUsed: result.provider,
      unverifiedRatio: totalCitations === 0 ? 0 : unverifiedCitations / totalCitations,
      citationCount: totalCitations,
    };
  }

  private parseResponse(raw: string) {
    const cleaned = stripCodeFence(raw);
    try {
      const json = JSON.parse(cleaned);
      const result = LlmAnalysisResponseSchema.safeParse(json);
      if (result.success) return result.data;
      this.logger.warn(
        `LLM response failed schema: ${result.error.issues
          .slice(0, 3)
          .map((i) => i.message)
          .join('; ')}`,
      );
      return null;
    } catch (err) {
      this.logger.warn(
        `LLM response not JSON: ${err instanceof Error ? err.message : String(err)} | rawLen=${raw.length}`,
      );
      return null;
    }
  }

  private dumpRawForDebug(raw: string, attemptLabel: string): void {
    try {
      const path = `/tmp/llm-raw-${attemptLabel}-${Date.now()}.txt`;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('node:fs').writeFileSync(path, raw, 'utf8');
      this.logger.warn(`Dumped raw LLM response (${raw.length} chars) to ${path}`);
    } catch (err) {
      this.logger.warn(
        `Failed to dump raw LLM response: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async loadRecentArticles(scope: MarketScope, date: Date): Promise<ArticleRow[]> {
    const since = new Date(date.getTime() - 36 * 60 * 60 * 1000);
    const sourceRegions = scope === 'kr' ? ['kr', 'global'] : ['us', 'global'];

    // 두 단계로 fetch (typing 안정성).
    const { data: sources, error: srcError } = await this.supabase
      .from('news_sources')
      .select('code, trust_tier')
      .in('region', sourceRegions)
      .returns<Array<{ code: string; trust_tier: 'verified' | 'community' | 'unverified' }>>();
    if (srcError) throw new Error(srcError.message);

    const sourceCodes = (sources ?? []).map((s) => s.code);
    if (sourceCodes.length === 0) return [];
    const trustByCode = new Map((sources ?? []).map((s) => [s.code, s.trust_tier]));

    const { data, error } = await this.supabase
      .from('news_articles')
      .select('url, source_code, title, summary, published_at, language, sector_tags')
      .in('source_code', sourceCodes)
      .gte('published_at', since.toISOString())
      .lte('published_at', date.toISOString())
      .order('published_at', { ascending: false })
      .limit(this.maxArticlesInPrompt)
      .returns<ArticleRow[]>();

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      ...row,
      news_sources_trust_tier: trustByCode.get(row.source_code) ?? 'unverified',
    }));
  }

  private toArticleInputs(rows: ArticleRow[]): ArticleInput[] {
    return rows.map((row, idx) => ({
      id: `A${String(idx + 1).padStart(3, '0')}`,
      url: row.url,
      sourceCode: row.source_code,
      trustTier: row.news_sources_trust_tier ?? 'unverified',
      title: row.title,
      summary: row.summary ?? '',
      publishedAt: new Date(row.published_at),
      language: row.language,
      sectorTags: row.sector_tags ?? [],
    }));
  }
}

function stripCodeFence(raw: string): string {
  let out = raw.trim();
  if (out.startsWith('```')) {
    const firstLineEnd = out.indexOf('\n');
    if (firstLineEnd >= 0) out = out.slice(firstLineEnd + 1);
    if (out.endsWith('```')) out = out.slice(0, -3);
  }
  return out.trim();
}

/** Gemini structured output을 위한 OpenAPI subset 스키마. LlmAnalysisResponseSchema와 일치해야 함. */
const ANALYSIS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    scores: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sector_code: { type: 'STRING' },
          direction_score: { type: 'INTEGER' },
          rationale: { type: 'STRING' },
          cited_ids: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['sector_code', 'direction_score', 'rationale', 'cited_ids'],
      },
    },
  },
  required: ['scores'],
};

// AnnotatedCitation re-export keeps type-only import explicit for downstream consumers.
export type { AnnotatedCitation };
