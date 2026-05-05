import { Logger } from '@nestjs/common';
import Parser from 'rss-parser';

import type { NormalizedArticle } from '@stock-tracker/shared';
import { tagSectors } from '../sector-keywords';
import type { SourceAdapter } from '../source-adapter.interface';

interface RssAdapterOptions {
  code: string;
  rssUrl: string;
  language: 'ko' | 'en';
  userAgent: string;
}

export class RssAdapter implements SourceAdapter {
  readonly code: string;
  private readonly logger: Logger;
  private readonly parser: Parser;
  private readonly rssUrl: string;
  private readonly language: 'ko' | 'en';

  constructor(options: RssAdapterOptions) {
    this.code = options.code;
    this.rssUrl = options.rssUrl;
    this.language = options.language;
    this.logger = new Logger(`RssAdapter:${options.code}`);
    this.parser = new Parser({
      timeout: 15_000,
      headers: { 'User-Agent': options.userAgent },
    });
  }

  async fetchSince(after: Date): Promise<NormalizedArticle[]> {
    const feed = await this.parser.parseURL(this.rssUrl);
    const out: NormalizedArticle[] = [];
    for (const item of feed.items ?? []) {
      const url = item.link?.trim();
      const title = item.title?.trim();
      const publishedAtRaw = item.isoDate ?? item.pubDate;
      if (!url || !title || !publishedAtRaw) continue;

      const publishedAt = new Date(publishedAtRaw);
      if (Number.isNaN(publishedAt.getTime())) continue;
      if (publishedAt < after) continue;

      const externalId = item.guid?.trim() || url;
      const summary = (item.contentSnippet ?? item.content ?? '').trim().slice(0, 500);

      out.push({
        externalId,
        url,
        title: title.slice(0, 300),
        summary,
        publishedAt,
        language: this.language,
        sectorTags: tagSectors(`${title} ${summary}`),
      });
    }
    this.logger.debug(`fetched ${out.length} items from ${this.rssUrl}`);
    return out;
  }
}
