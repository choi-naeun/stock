import { Logger } from '@nestjs/common';

import type { NormalizedArticle } from '@stock-tracker/shared';
import { tagSectors } from '../sector-keywords';
import type { SourceAdapter } from '../source-adapter.interface';

interface DartListItem {
  rcept_no: string;
  corp_name: string;
  report_nm: string;
  rcept_dt: string; // YYYYMMDD
  flr_nm: string;
}

interface DartListResponse {
  status: string;
  message: string;
  list?: DartListItem[];
}

interface DartAdapterOptions {
  code: string;
  apiKey: string;
}

/**
 * DART Open API 어댑터. 일별 신규 공시 목록을 가져온다.
 * 본문은 받아오지 않고 메타데이터만 기록. 사용자에게는 항상 DART URL로 outbound.
 */
export class DartAdapter implements SourceAdapter {
  readonly code: string;
  private readonly logger: Logger;
  private readonly apiKey: string;

  constructor(options: DartAdapterOptions) {
    this.code = options.code;
    this.apiKey = options.apiKey;
    this.logger = new Logger(`DartAdapter:${options.code}`);
  }

  async fetchSince(after: Date): Promise<NormalizedArticle[]> {
    const begin = formatYmd(after);
    const end = formatYmd(new Date());
    const url = new URL('https://opendart.fss.or.kr/api/list.json');
    url.searchParams.set('crtfc_key', this.apiKey);
    url.searchParams.set('bgn_de', begin);
    url.searchParams.set('end_de', end);
    url.searchParams.set('page_count', '100');

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      throw new Error(`DART API ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as DartListResponse;
    if (json.status !== '000') {
      // '013' 조회된 데이터 없음 → 빈 배열로 처리
      if (json.status === '013') return [];
      throw new Error(`DART status ${json.status}: ${json.message}`);
    }

    const out: NormalizedArticle[] = [];
    for (const item of json.list ?? []) {
      const publishedAt = parseYmd(item.rcept_dt);
      if (!publishedAt) continue;
      if (publishedAt < after) continue;

      const articleUrl = `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`;
      const title = `[${item.corp_name}] ${item.report_nm}`;
      const summary = `${item.corp_name} · ${item.flr_nm} · 접수일자 ${item.rcept_dt}`;

      out.push({
        externalId: item.rcept_no,
        url: articleUrl,
        title,
        summary,
        publishedAt,
        language: 'ko',
        sectorTags: tagSectors(`${item.corp_name} ${item.report_nm}`),
      });
    }
    this.logger.debug(`fetched ${out.length} disclosures from DART`);
    return out;
  }
}

function formatYmd(date: Date): string {
  const y = date.getFullYear().toString();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function parseYmd(ymd: string): Date | null {
  if (!/^\d{8}$/.test(ymd)) return null;
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date;
}
