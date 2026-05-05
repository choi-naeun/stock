import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  DailyReportEnvelope,
  DailyReportPayload,
  MarketScope,
} from '@stock-tracker/shared';

import {
  AnalysisService,
  type SectorAnalysisResult,
} from '../analysis/analysis.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';

interface ReportRow {
  id: string;
  report_date: string;
  market_scope: MarketScope;
  status: 'pending' | 'generating' | 'published' | 'failed';
  published_at: string | null;
  payload: DailyReportPayload | null;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly analysis: AnalysisService,
    private readonly ingestion: IngestionService,
  ) {}

  /**
   * Ingest → Analyze → Publish 의 트리거. 시장당 한 번씩 실행.
   * 이미 'published'인 같은 날짜·시장 리포트가 있으면 그대로 반환 (재발행 방지).
   */
  async runDaily(scope: MarketScope, now: Date = new Date()): Promise<DailyReportEnvelope> {
    const reportDate = toDateString(now);
    await this.ingestion.ingestAll(scope);

    const placeholder = await this.upsertPlaceholder(reportDate, scope);
    if (placeholder.status === 'published') {
      return this.toEnvelope(placeholder);
    }

    await this.markStatus(placeholder.id, 'generating');
    try {
      const analysis = await this.analysis.analyzeMarket(scope, now);
      const payload = this.assemblePayload(analysis, scope, reportDate, now);
      const updated = await this.publish(placeholder.id, payload, analysis);
      return this.toEnvelope(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Report failed for ${scope} ${reportDate}: ${message}`);
      await this.markStatus(placeholder.id, 'failed', { error: message });
      throw err;
    }
  }

  async findPublished(scope: MarketScope, date?: Date): Promise<DailyReportEnvelope | null> {
    const reportDate = date ? toDateString(date) : toDateString(new Date());
    const { data, error } = await this.supabase
      .from('daily_reports')
      .select('id, report_date, market_scope, status, published_at, payload')
      .eq('report_date', reportDate)
      .eq('market_scope', scope)
      .maybeSingle<ReportRow>();
    if (error) throw new Error(error.message);
    return data ? this.toEnvelope(data) : null;
  }

  async ensurePlaceholderForToday(now: Date = new Date()): Promise<void> {
    const reportDate = toDateString(now);
    for (const scope of ['kr', 'us'] as const) {
      await this.upsertPlaceholder(reportDate, scope);
    }
  }

  private async upsertPlaceholder(
    reportDate: string,
    scope: MarketScope,
  ): Promise<ReportRow> {
    // INSERT ... ON CONFLICT DO NOTHING 후 SELECT (Supabase JS는 직접 ignoreDuplicates 옵션 사용)
    await this.supabase
      .from('daily_reports')
      .upsert(
        { report_date: reportDate, market_scope: scope, status: 'pending' },
        { onConflict: 'report_date,market_scope', ignoreDuplicates: true },
      );

    const { data, error } = await this.supabase
      .from('daily_reports')
      .select('id, report_date, market_scope, status, published_at, payload')
      .eq('report_date', reportDate)
      .eq('market_scope', scope)
      .single<ReportRow>();
    if (error) throw new Error(error.message);
    return data;
  }

  private async markStatus(
    id: string,
    status: ReportRow['status'],
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (metadata) update.metadata = metadata;
    const { error } = await this.supabase.from('daily_reports').update(update).eq('id', id);
    if (error) {
      this.logger.warn(`Failed to mark report ${id} as ${status}: ${error.message}`);
    }
  }

  private async publish(
    id: string,
    payload: DailyReportPayload,
    analysis: SectorAnalysisResult,
  ): Promise<ReportRow> {
    const publishedAt = new Date();
    const { error } = await this.supabase
      .from('daily_reports')
      .update({
        status: 'published',
        published_at: publishedAt.toISOString(),
        payload,
        metadata: {
          unverifiedRatio: analysis.unverifiedRatio,
          citationCount: analysis.citationCount,
          llmProviderUsed: analysis.llmProviderUsed,
          sectorCount: analysis.scores.length,
        },
        updated_at: publishedAt.toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(`Failed to publish: ${error.message}`);

    // 정규화 행도 함께 적재
    if (analysis.scores.length > 0) {
      const rows = analysis.scores.map((s) => ({
        report_id: id,
        taxonomy: analysis.taxonomy,
        sector_code: s.sectorCode,
        sector_name_ko: s.sectorNameKo,
        direction_score: s.directionScore,
        citations: s.citations,
        rank_top: s.rankTop ?? null,
        rank_bottom: s.rankBottom ?? null,
        rationale_advanced: s.rationaleAdvanced,
        rationale_neutral: s.rationaleNeutral ?? null,
      }));
      // delete 후 insert로 재발행 시 중복 방지
      await this.supabase.from('report_sector_scores').delete().eq('report_id', id);
      const { error: scoreError } = await this.supabase.from('report_sector_scores').insert(rows);
      if (scoreError) {
        this.logger.warn(`Failed to insert sector scores: ${scoreError.message}`);
      }
    }

    const { data, error: fetchError } = await this.supabase
      .from('daily_reports')
      .select('id, report_date, market_scope, status, published_at, payload')
      .eq('id', id)
      .single<ReportRow>();
    if (fetchError) throw new Error(fetchError.message);
    return data;
  }

  private assemblePayload(
    analysis: SectorAnalysisResult,
    scope: MarketScope,
    reportDate: string,
    publishedAt: Date,
  ): DailyReportPayload {
    return {
      reportDate,
      marketScope: scope,
      taxonomy: analysis.taxonomy,
      publishedAt: publishedAt.toISOString(),
      scores: analysis.scores,
      top5: analysis.top5,
      bottom5: analysis.bottom5,
      marketSummary: {
        // Phase 1A에서는 placeholder. Phase 1B에서 MarketDataModule이 실제 지수를 채움.
        indices: scope === 'kr'
          ? [
              { symbol: 'KOSPI', name: 'KOSPI', lastClose: null },
              { symbol: 'KOSDAQ', name: 'KOSDAQ', lastClose: null },
            ]
          : [
              { symbol: 'SPX', name: 'S&P 500', lastClose: null },
              { symbol: 'IXIC', name: 'NASDAQ', lastClose: null },
            ],
      },
      metadata: {
        unverifiedRatio: analysis.unverifiedRatio,
        citationCount: analysis.citationCount,
        llmProviderUsed: analysis.llmProviderUsed,
      },
    };
  }

  private toEnvelope(row: ReportRow): DailyReportEnvelope {
    return {
      id: row.id,
      reportDate: row.report_date,
      marketScope: row.market_scope,
      status: row.status,
      publishedAt: row.published_at,
      payload: row.payload,
    };
  }
}

function toDateString(d: Date): string {
  // KST 기준 날짜 (PRD 발행 시점이 KST 07:00).
  const kstMs = d.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}
