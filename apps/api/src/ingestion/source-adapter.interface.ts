import type { NormalizedArticle } from '@stock-tracker/shared';

export interface SourceAdapter {
  readonly code: string;
  fetchSince(after: Date): Promise<NormalizedArticle[]>;
}
