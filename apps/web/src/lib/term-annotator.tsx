import type { ReactNode } from 'react';

import { Term } from '@/components/report/Term';
import type { GlossaryEntry } from '@stock-tracker/shared';

/**
 * 본문 문자열에서 Glossary DB에 등재된 용어를 찾아 <Term> 컴포넌트로 래핑.
 *
 * 규칙 (PRD F9):
 * - 길이 desc 정렬 (긴 용어 우선 매칭)
 * - 한 페이지에 같은 용어는 첫 등장 1회만 래핑 (학습 부담 완화)
 * - 영문 약어(PER 등)는 단어 경계 강제, 한국어는 인접 한글이 없을 때만 매칭
 */
export function annotateTerms(text: string, glossary: GlossaryEntry[]): ReactNode[] {
  if (!text) return [text];

  const sorted = [...glossary].sort((a, b) => b.term.length - a.term.length);
  const wrapped = new Set<string>();

  const matchAt = (
    s: string,
    idx: number,
  ): { entry: GlossaryEntry; length: number } | null => {
    for (const entry of sorted) {
      const term = entry.term;
      if (wrapped.has(normalizeTerm(term))) continue;
      if (s.slice(idx, idx + term.length) !== term) continue;
      if (!isWordBoundary(s, idx, term)) continue;
      return { entry, length: term.length };
    }
    return null;
  };

  const out: ReactNode[] = [];
  let cursor = 0;
  let buffer = '';

  while (cursor < text.length) {
    const match = matchAt(text, cursor);
    if (match) {
      if (buffer) {
        out.push(buffer);
        buffer = '';
      }
      const matchedText = text.slice(cursor, cursor + match.length);
      out.push(
        <Term key={`${match.entry.term}-${cursor}`} entry={match.entry}>
          {matchedText}
        </Term>,
      );
      wrapped.add(normalizeTerm(match.entry.term));
      cursor += match.length;
    } else {
      buffer += text[cursor];
      cursor += 1;
    }
  }
  if (buffer) out.push(buffer);
  return out;
}

function normalizeTerm(term: string): string {
  return term.toLowerCase();
}

const HANGUL_RE = /[\u3131-\u318E\uAC00-\uD7A3]/;
const ASCII_WORD_RE = /[A-Za-z0-9]/;

function isWordBoundary(text: string, idx: number, term: string): boolean {
  const before = idx > 0 ? text[idx - 1] : '';
  const afterIdx = idx + term.length;
  const after = afterIdx < text.length ? text[afterIdx] : '';

  // 영문/숫자 약어: ASCII 단어 경계
  if (/^[A-Za-z0-9]+$/.test(term)) {
    if (before && ASCII_WORD_RE.test(before)) return false;
    if (after && ASCII_WORD_RE.test(after)) return false;
    return true;
  }

  // 한국어: 인접 한글이 있으면 부분 매칭으로 간주하여 거부
  if (before && HANGUL_RE.test(before)) return false;
  if (after && HANGUL_RE.test(after)) return false;
  return true;
}
