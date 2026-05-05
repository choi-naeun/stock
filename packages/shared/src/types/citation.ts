export type CitationTier = 'verified' | 'community' | 'unverified';

export interface RawCitation {
  url: string;
  quote: string;
}

export interface AnnotatedCitation extends RawCitation {
  tier: CitationTier;
  sourceCode?: string;
  publishedAt?: string;
  reason?: 'not_in_corpus' | 'http_404' | 'community_source' | 'verified_in_corpus';
}
