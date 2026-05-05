import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { IngestionRunSummary, NormalizedArticle, NewsSource } from '@stock-tracker/shared';

import type { Env } from '../config/env.schema';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { DartAdapter } from './adapters/dart.adapter';
import { EdgarAdapter } from './adapters/edgar.adapter';
import { RssAdapter } from './adapters/rss.adapter';
import { RobotsChecker } from './robots-checker';
import type { SourceAdapter } from './source-adapter.interface';

interface NewsSourceRow {
  code: string;
  display_name: string;
  region: 'kr' | 'us' | 'global';
  source_type: 'news' | 'filing';
  trust_tier: 'verified' | 'community' | 'unverified';
  rss_url: string | null;
  active: boolean;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly adapters = new Map<string, SourceAdapter>();
  private readonly userAgent: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly config: ConfigService<Env, true>,
    private readonly robots: RobotsChecker,
  ) {
    this.userAgent = `stock-tracker/${this.config.get('NODE_ENV', { infer: true }) ?? 'dev'} (${
      this.config.get('ADMIN_EMAIL', { infer: true }) ?? 'admin@example.com'
    })`;
  }

  /**
   * 등록된 모든 active 소스 또는 region 필터 대상에 대해 순차 수집.
   * 한 소스 실패가 다른 소스를 막지 않도록 try/catch로 격리.
   */
  async ingestAll(scope: 'kr' | 'us' | 'all' = 'all'): Promise<IngestionRunSummary[]> {
    const sources = await this.loadActiveSources(scope);
    const summaries: IngestionRunSummary[] = [];
    for (const source of sources) {
      try {
        const summary = await this.ingestSource(source.code);
        summaries.push(summary);
      } catch (err) {
        this.logger.error(
          `Unhandled ingestion error for ${source.code}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return summaries;
  }

  async ingestSource(sourceCode: string): Promise<IngestionRunSummary> {
    const source = await this.loadSource(sourceCode);
    const adapter = this.resolveAdapter(source);
    const startedAt = new Date();
    const runId = await this.startRun(sourceCode, startedAt);

    let inserted = 0;
    let skipped = 0;
    let errorCount = 0;
    let errorSummary: string | undefined;
    let status: 'success' | 'partial' | 'failed' = 'success';

    try {
      if (source.rss_url) {
        const allowed = await this.robots.isAllowed(source.rss_url, this.userAgent);
        if (!allowed) {
          throw new Error(`robots.txt disallows ${source.rss_url}`);
        }
      }

      const lastSuccess = await this.lastSuccessAt(sourceCode);
      const after = lastSuccess ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
      const articles = await adapter.fetchSince(after);

      for (const article of articles) {
        try {
          const result = await this.upsertArticle(sourceCode, article);
          if (result === 'inserted') inserted++;
          else skipped++;
        } catch (err) {
          errorCount++;
          this.logger.warn(
            `Failed to upsert article ${article.externalId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      if (errorCount > 0 && inserted === 0) {
        status = 'failed';
        errorSummary = `All ${errorCount} upserts failed`;
      } else if (errorCount > 0) {
        status = 'partial';
      }
    } catch (err) {
      status = 'failed';
      errorSummary = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ingestion failed for ${sourceCode}: ${errorSummary}`);
    }

    const finishedAt = new Date();
    await this.finishRun(runId, {
      inserted,
      skipped,
      errorCount,
      status,
      errorSummary,
      finishedAt,
    });

    return {
      sourceCode,
      status,
      insertedCount: inserted,
      skippedCount: skipped,
      errorCount,
      errorSummary,
      startedAt,
      finishedAt,
    };
  }

  private resolveAdapter(source: NewsSourceRow): SourceAdapter {
    if (this.adapters.has(source.code)) return this.adapters.get(source.code)!;

    let adapter: SourceAdapter;
    if (source.source_type === 'news' && source.rss_url) {
      adapter = new RssAdapter({
        code: source.code,
        rssUrl: source.rss_url,
        language: source.region === 'kr' ? 'ko' : 'en',
        userAgent: this.userAgent,
      });
    } else if (source.code === 'dart') {
      adapter = new DartAdapter({
        code: source.code,
        apiKey: this.config.get('DART_API_KEY', { infer: true }),
      });
    } else if (source.code === 'sec') {
      adapter = new EdgarAdapter({
        code: source.code,
        userAgent: this.config.get('SEC_EDGAR_USER_AGENT', { infer: true }),
      });
    } else {
      throw new Error(`No adapter for source ${source.code}`);
    }

    this.adapters.set(source.code, adapter);
    return adapter;
  }

  private async loadActiveSources(
    scope: 'kr' | 'us' | 'all',
  ): Promise<NewsSourceRow[]> {
    let query = this.supabase
      .from('news_sources')
      .select('code, display_name, region, source_type, trust_tier, rss_url, active')
      .eq('active', true);
    if (scope !== 'all') {
      query = query.in('region', [scope, 'global']);
    }
    const { data, error } = await query.returns<NewsSourceRow[]>();
    if (error) throw new Error(`Failed to load news_sources: ${error.message}`);
    return data ?? [];
  }

  private async loadSource(code: string): Promise<NewsSourceRow> {
    const { data, error } = await this.supabase
      .from('news_sources')
      .select('code, display_name, region, source_type, trust_tier, rss_url, active')
      .eq('code', code)
      .maybeSingle<NewsSourceRow>();
    if (error) throw new Error(`Failed to load source ${code}: ${error.message}`);
    if (!data) throw new NotFoundException(`Source not found: ${code}`);
    return data;
  }

  private async startRun(sourceCode: string, startedAt: Date): Promise<number> {
    const { data, error } = await this.supabase
      .from('ingestion_runs')
      .insert({ source_code: sourceCode, started_at: startedAt.toISOString(), status: 'running' })
      .select('id')
      .single<{ id: number }>();
    if (error) throw new Error(`Failed to start ingestion run: ${error.message}`);
    return data.id;
  }

  private async finishRun(
    runId: number,
    payload: {
      inserted: number;
      skipped: number;
      errorCount: number;
      status: 'success' | 'partial' | 'failed';
      errorSummary?: string;
      finishedAt: Date;
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .from('ingestion_runs')
      .update({
        inserted_count: payload.inserted,
        skipped_count: payload.skipped,
        error_count: payload.errorCount,
        status: payload.status,
        error_summary: payload.errorSummary ?? null,
        finished_at: payload.finishedAt.toISOString(),
      })
      .eq('id', runId);
    if (error) {
      this.logger.warn(`Failed to finish ingestion run ${runId}: ${error.message}`);
    }
  }

  private async lastSuccessAt(sourceCode: string): Promise<Date | null> {
    const { data, error } = await this.supabase
      .from('ingestion_runs')
      .select('started_at')
      .eq('source_code', sourceCode)
      .eq('status', 'success')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ started_at: string }>();
    if (error) {
      this.logger.warn(`Failed to query last success for ${sourceCode}: ${error.message}`);
      return null;
    }
    return data ? new Date(data.started_at) : null;
  }

  private async upsertArticle(
    sourceCode: string,
    article: NormalizedArticle,
  ): Promise<'inserted' | 'skipped'> {
    const { error } = await this.supabase
      .from('news_articles')
      .upsert(
        {
          source_code: sourceCode,
          external_id: article.externalId,
          url: article.url,
          title: article.title,
          summary: article.summary,
          published_at: article.publishedAt.toISOString(),
          language: article.language,
          sector_tags: article.sectorTags ?? [],
        },
        { onConflict: 'source_code,external_id', ignoreDuplicates: true },
      )
      .select('id');
    if (error) throw new Error(error.message);
    // ignoreDuplicates 일 때 select 결과는 새 insert만 포함. 정확한 inserted/skipped 분리는
    // 운영 영향이 작으므로 모두 inserted로 집계.
    return 'inserted';
  }

  /** 다른 모듈(Citation 등)에서 corpus 멤버십 확인용. */
  async findArticlesByUrlHashes(urlHashes: string[]): Promise<Map<string, NewsSource>> {
    if (urlHashes.length === 0) return new Map();

    // 두 단계 fetch: 먼저 url_hash → source_code, 다음 source_code 일괄 조회.
    // join 결과 타입 추론이 까다로워 분리하는 편이 안정적.
    const { data: articles, error: articlesError } = await this.supabase
      .from('news_articles')
      .select('url_hash, source_code')
      .in('url_hash', urlHashes)
      .returns<Array<{ url_hash: string; source_code: string }>>();
    if (articlesError) throw new Error(articlesError.message);

    const sourceCodes = Array.from(new Set((articles ?? []).map((a) => a.source_code)));
    if (sourceCodes.length === 0) return new Map();

    const { data: sources, error: sourcesError } = await this.supabase
      .from('news_sources')
      .select('code, display_name, region, source_type, trust_tier, rss_url, active')
      .in('code', sourceCodes)
      .returns<NewsSourceRow[]>();
    if (sourcesError) throw new Error(sourcesError.message);

    const sourceByCode = new Map<string, NewsSourceRow>();
    for (const s of sources ?? []) sourceByCode.set(s.code, s);

    const out = new Map<string, NewsSource>();
    for (const article of articles ?? []) {
      const s = sourceByCode.get(article.source_code);
      if (!s) continue;
      out.set(article.url_hash, {
        code: s.code,
        displayName: s.display_name,
        region: s.region,
        sourceType: s.source_type,
        trustTier: s.trust_tier,
        rssUrl: s.rss_url,
      });
    }
    return out;
  }
}
