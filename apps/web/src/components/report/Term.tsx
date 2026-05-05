'use client';

import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';

import type { GlossaryEntry } from '@stock-tracker/shared';
import { cn } from '@/lib/utils';

interface TermProps {
  entry: GlossaryEntry;
  children: ReactNode;
}

/**
 * 본문에 등장하는 전문용어 인라인 풀이.
 * - 마우스 hover + 키보드 포커스(Tab+Enter) 모두 지원 (A11y)
 * - 풀이는 DB의 intermediate 정의를 기본 사용 (Phase 1A는 EasyMode 자동 변환 미포함)
 */
export function Term({ entry, children }: TermProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'cursor-help underline decoration-dotted decoration-neutral-400 underline-offset-4',
            'hover:decoration-solid hover:decoration-blue-500',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:rounded-sm',
          )}
          aria-label={`용어 풀이: ${entry.term}`}
        >
          {children}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          className={cn(
            'z-50 w-72 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg',
            'dark:border-neutral-700 dark:bg-neutral-900',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
          )}
        >
          <header className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">{entry.term}</h3>
            {entry.termEn && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {entry.termEn}
              </span>
            )}
          </header>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
            {entry.definitions.intermediate}
          </p>
          {entry.examples.length > 0 && (
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              예: {entry.examples[0]}
            </p>
          )}
          <Popover.Arrow className="fill-white dark:fill-neutral-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
