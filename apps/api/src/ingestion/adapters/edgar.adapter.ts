import { Logger } from '@nestjs/common';

import type { NormalizedArticle } from '@stock-tracker/shared';
import type { SourceAdapter } from '../source-adapter.interface';

interface EdgarAdapterOptions {
  code: string;
  userAgent: string;
}

/**
 * SEC EDGAR Atom 피드 어댑터.
 * EDGAR 정책: User-Agent 헤더 명시 필수 (이메일 포함 권장).
 * 본문 다운로드 없이 메타데이터만 저장.
 */
export class EdgarAdapter implements SourceAdapter {
  readonly code: string;
  private readonly logger: Logger;
  private readonly userAgent: string;

  constructor(options: EdgarAdapterOptions) {
    this.code = options.code;
    this.userAgent = options.userAgent;
    this.logger = new Logger(`EdgarAdapter:${options.code}`);
  }

  async fetchSince(after: Date): Promise<NormalizedArticle[]> {
    const url =
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&company=&dateb=&owner=include&count=100&output=atom';

    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': this.userAgent, Accept: 'application/atom+xml' },
    });
    if (!res.ok) {
      throw new Error(`EDGAR ${res.status}: ${await res.text()}`);
    }
    const xml = await res.text();
    const out: NormalizedArticle[] = [];

    const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
    let match: RegExpExecArray | null;
    while ((match = entryRe.exec(xml)) !== null) {
      const block = match[1] ?? '';
      const title = extract(block, 'title');
      const updated = extract(block, 'updated');
      const id = extract(block, 'id');
      const summary = extract(block, 'summary') ?? '';
      const linkMatch = /<link[^>]*href="([^"]+)"/.exec(block);
      const link = linkMatch?.[1];

      if (!title || !updated || !id || !link) continue;

      const publishedAt = new Date(updated);
      if (Number.isNaN(publishedAt.getTime()) || publishedAt < after) continue;

      out.push({
        externalId: id,
        url: link,
        title: title.slice(0, 300),
        summary: summary.trim().slice(0, 500),
        publishedAt,
        language: 'en',
      });
    }
    this.logger.debug(`fetched ${out.length} EDGAR entries`);
    return out;
  }
}

function extract(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const m = re.exec(xml);
  if (!m) return null;
  return decodeXmlEntities(m[1] ?? '');
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
