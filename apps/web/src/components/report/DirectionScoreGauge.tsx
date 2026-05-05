import { cn } from '@/lib/utils';

interface Props {
  score: number | null;
  className?: string;
}

/**
 * -5 ~ +5 방향성 점수를 시각화. null이면 "근거 불충분" 표기.
 */
export function DirectionScoreGauge({ score, className }: Props) {
  if (score === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
          className,
        )}
      >
        근거 불충분
      </span>
    );
  }

  const normalized = Math.max(-5, Math.min(5, score));
  const positive = normalized > 0;
  const negative = normalized < 0;

  return (
    <div className={cn('flex items-center gap-2', className)} aria-label={`방향성 점수 ${score}`}>
      <span
        className={cn(
          'min-w-[2.5rem] text-center text-sm font-semibold tabular-nums',
          positive && 'text-green-600 dark:text-green-400',
          negative && 'text-red-600 dark:text-red-400',
          !positive && !negative && 'text-neutral-500',
        )}
      >
        {positive ? '+' : ''}
        {normalized}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className={cn(
            'absolute inset-y-0 transition-all',
            positive ? 'bg-green-500' : negative ? 'bg-red-500' : 'bg-neutral-400',
          )}
          style={{
            left: '50%',
            width: `${Math.abs(normalized) * 10}%`,
            transform: negative ? 'translateX(-100%)' : undefined,
          }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-400 dark:bg-neutral-600" />
      </div>
    </div>
  );
}
