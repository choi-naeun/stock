import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AnnotatedCitation,
  CitationTier,
  RawCitation,
} from '@stock-tracker/shared';

import { IngestionService } from '../ingestion/ingestion.service';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { hashUrl, normalizeUrl } from './url-hash';

interface VerificationRow {
  url_hash: string;
  url: string;
  in_corpus: boolean;
  http_status: number | null;
  last_checked_at: string;
  tier: CitationTier;
}

@Injectable()
export class CitationService {
  private readonly logger = new Logger(CitationService.name);
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000;
  private readonly headTimeoutMs = 8_000;
  private readonly hostInflight = new Map<string, Promise<unknown>>();

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly ingestion: IngestionService,
  ) {}

  /**
   * 빠른 corpus 존재 확인. AnalysisModule이 LLM 응답을 받자마자 cited URL을 이걸로 1차 분류.
   * Verified: news_articles에 존재 + source.trust_tier = 'verified'
   * Community: news_articles에 존재 + trust_tier = 'community'
   * Unverified: news_articles에 없음
   */
  async classifyByCorpus(urls: string[]): Promise<Map<string, CitationTier>> {
    if (urls.length === 0) return new Map();
    const normalized = urls.map(normalizeUrl);
    const hashes = normalized.map(hashUrl);
    const hashToOriginal = new Map<string, string>();
    for (let i = 0; i < urls.length; i++) {
      hashToOriginal.set(hashes[i]!, urls[i]!);
    }

    const sourceMap = await this.ingestion.findArticlesByUrlHashes(hashes);
    const out = new Map<string, CitationTier>();
    for (const [hash, original] of hashToOriginal.entries()) {
      const source = sourceMap.get(hash);
      if (!source) {
        out.set(original, 'unverified');
      } else {
        out.set(original, source.trustTier);
      }
    }
    return out;
  }

  /**
   * 깊은 검증. cited URL에 대해 (1) 기존 캐시 확인 (2) HEAD 요청 (3) 결과 캐시 저장.
   * host당 동시 1개로 throttle하여 매체 측 rate limit을 피한다.
   */
  async verifyHttp(urls: string[]): Promise<Map<string, CitationTier>> {
    const out = new Map<string, CitationTier>();
    if (urls.length === 0) return out;

    const normalized = urls.map(normalizeUrl);
    const hashes = normalized.map(hashUrl);
    const cached = await this.loadCached(hashes);

    const corpusTiers = await this.classifyByCorpus(urls);

    const tasks: Promise<void>[] = [];
    for (let i = 0; i < urls.length; i++) {
      const original = urls[i]!;
      const url = normalized[i]!;
      const hash = hashes[i]!;
      const corpus = corpusTiers.get(original) ?? 'unverified';
      const cachedRow = cached.get(hash);

      if (cachedRow && this.isFresh(cachedRow.last_checked_at)) {
        out.set(original, cachedRow.tier);
        continue;
      }

      tasks.push(
        this.runHostThrottled(url, async () => {
          const headResult = await this.headCheck(url);
          const tier = this.combineTier(corpus, headResult.status);
          await this.persistVerification({
            urlHash: hash,
            url,
            inCorpus: corpus !== 'unverified',
            httpStatus: headResult.status,
            tier,
          });
          out.set(original, tier);
        }),
      );
    }
    await Promise.all(tasks);
    return out;
  }

  /**
   * RawCitation 배열에 tier·source 정보를 부여하여 AnnotatedCitation으로 반환.
   * AnalysisModule이 publish 직전에 호출. 결과는 daily_reports.payload에 그대로 저장.
   */
  async annotate(citations: RawCitation[]): Promise<AnnotatedCitation[]> {
    if (citations.length === 0) return [];
    const urls = citations.map((c) => c.url);
    const tiers = await this.verifyHttp(urls);
    const sourceMap = await this.ingestion.findArticlesByUrlHashes(
      urls.map((u) => hashUrl(normalizeUrl(u))),
    );

    return citations.map((c) => {
      const tier = tiers.get(c.url) ?? 'unverified';
      const source = sourceMap.get(hashUrl(normalizeUrl(c.url)));
      let reason: AnnotatedCitation['reason'];
      if (tier === 'verified') reason = 'verified_in_corpus';
      else if (tier === 'community') reason = 'community_source';
      else reason = source ? 'http_404' : 'not_in_corpus';

      return {
        url: c.url,
        quote: c.quote,
        tier,
        sourceCode: source?.code,
        reason,
      };
    });
  }

  private combineTier(corpus: CitationTier, httpStatus: number): CitationTier {
    // HTTP 4xx/5xx 라면 무조건 unverified로 강등 (원문이 사라진 케이스).
    if (httpStatus >= 400) return 'unverified';
    return corpus;
  }

  private async headCheck(url: string): Promise<{ status: number }> {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.headTimeoutMs),
        redirect: 'follow',
      });
      return { status: res.status };
    } catch (err) {
      this.logger.debug(
        `HEAD failed for ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { status: 0 };
    }
  }

  /**
   * host당 한 번에 하나의 HEAD만 실행. p-queue를 도입하지 않고 단순 inflight map으로 처리.
   * (지인 10명 규모에서 cited URL 수가 적어 충분)
   */
  private async runHostThrottled<T>(url: string, task: () => Promise<T>): Promise<T> {
    const host = (() => {
      try {
        return new URL(url).host;
      } catch {
        return 'unknown';
      }
    })();
    const prev = this.hostInflight.get(host) ?? Promise.resolve();
    const next = prev.then(task, task);
    this.hostInflight.set(host, next.catch(() => undefined));
    return next;
  }

  private isFresh(checkedAtIso: string): boolean {
    const checkedAt = Date.parse(checkedAtIso);
    if (Number.isNaN(checkedAt)) return false;
    return Date.now() - checkedAt < this.cacheTtlMs;
  }

  private async loadCached(hashes: string[]): Promise<Map<string, VerificationRow>> {
    if (hashes.length === 0) return new Map();
    const { data, error } = await this.supabase
      .from('url_verifications')
      .select('url_hash, url, in_corpus, http_status, last_checked_at, tier')
      .in('url_hash', hashes)
      .returns<VerificationRow[]>();
    if (error) {
      this.logger.warn(`Failed to load url_verifications: ${error.message}`);
      return new Map();
    }
    const out = new Map<string, VerificationRow>();
    for (const row of data ?? []) out.set(row.url_hash, row);
    return out;
  }

  private async persistVerification(input: {
    urlHash: string;
    url: string;
    inCorpus: boolean;
    httpStatus: number;
    tier: CitationTier;
  }): Promise<void> {
    const { error } = await this.supabase.from('url_verifications').upsert(
      {
        url_hash: input.urlHash,
        url: input.url,
        in_corpus: input.inCorpus,
        http_status: input.httpStatus,
        tier: input.tier,
        last_checked_at: new Date().toISOString(),
      },
      { onConflict: 'url_hash' },
    );
    if (error) {
      this.logger.warn(`Failed to upsert url_verifications: ${error.message}`);
    }
  }
}
