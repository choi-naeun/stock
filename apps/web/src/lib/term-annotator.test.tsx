import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { GlossaryEntry } from '@stock-tracker/shared';
import { annotateTerms } from './term-annotator';

const fixture: GlossaryEntry[] = [
  {
    term: 'PER',
    termEn: 'Price-to-Earnings Ratio',
    category: 'indicator',
    definitions: { advanced: 'A', intermediate: 'I', beginner: 'B' },
    examples: [],
    relatedTerms: [],
  },
  {
    term: '반도체',
    termEn: 'Semiconductors',
    category: 'market',
    definitions: { advanced: 'A', intermediate: 'I', beginner: 'B' },
    examples: [],
    relatedTerms: [],
  },
  {
    term: '주가수익비율',
    termEn: 'PER',
    category: 'indicator',
    definitions: { advanced: 'A', intermediate: 'I', beginner: 'B' },
    examples: [],
    relatedTerms: [],
  },
];

function render(nodes: ReturnType<typeof annotateTerms>): string {
  return renderToStaticMarkup(<>{nodes.map((n, i) => <span key={i}>{n}</span>)}</>);
}

describe('annotateTerms', () => {
  it('wraps PER in Term button', () => {
    const html = render(annotateTerms('이 종목 PER이 낮다', fixture));
    expect(html).toContain('button');
    expect(html).toContain('PER');
  });

  it('does not wrap PER inside PERSON (English word boundary)', () => {
    const html = render(annotateTerms('I met a PERSON yesterday', fixture));
    // PERSON should remain plain text — no button wrapping
    expect(html).toContain('PERSON');
    expect(html).not.toMatch(/<button[^>]*>PER<\/button>SON/);
  });

  it('wraps Korean terms when not part of larger word', () => {
    const html = render(annotateTerms('반도체 섹터 강세', fixture));
    expect(html).toContain('button');
    expect(html).toContain('반도체');
  });

  it('does not wrap Korean term that is part of a longer word', () => {
    const html = render(annotateTerms('반도체업계는 약진했다', fixture));
    // 반도체업계 — 반도체 다음에 한글이 이어지면 매칭 안 됨
    expect(html).not.toMatch(/<button[^>]*>반도체<\/button>업계/);
  });

  it('prefers longer term: 주가수익비율 over PER when both present', () => {
    const html = render(annotateTerms('주가수익비율은 12배', fixture));
    expect(html).toContain('주가수익비율');
  });

  it('wraps each term only on first occurrence', () => {
    const html = render(annotateTerms('PER 12, PER 14, PER 16', fixture));
    const matches = html.match(/<button/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});
