import type { CitationTier } from '@stock-tracker/shared';

import { cn } from '@/lib/utils';

const TIER_STYLE: Record<CitationTier, { color: string; label: string; emoji: string }> = {
  verified: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    label: '근거 확인',
    emoji: '✓',
  },
  community: {
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    label: '커뮤니티',
    emoji: '👥',
  },
  unverified: {
    color: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    label: '근거 불충분',
    emoji: '⚠️',
  },
};

export function TierBadge({ tier, className }: { tier: CitationTier; className?: string }) {
  const style = TIER_STYLE[tier];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        style.color,
        className,
      )}
      aria-label={`근거 등급: ${style.label}`}
    >
      <span aria-hidden>{style.emoji}</span>
      {style.label}
    </span>
  );
}
