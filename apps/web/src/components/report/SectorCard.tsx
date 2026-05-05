import type { SectorScore } from '@stock-tracker/shared';

import { cn } from '@/lib/utils';
import { DirectionScoreGauge } from './DirectionScoreGauge';

interface Props {
  sector: SectorScore;
  variant: 'top' | 'bottom';
  rank: number;
}

export function SectorCard({ sector, variant, rank }: Props) {
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md',
        'dark:bg-neutral-900',
        variant === 'top'
          ? 'border-green-200 dark:border-green-900/60'
          : 'border-red-200 dark:border-red-900/60',
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {variant === 'top' ? '주목 섹터' : '주의 섹터'} #{rank}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold">{sector.sectorNameKo}</h3>
        </div>
      </header>
      <DirectionScoreGauge score={sector.directionScore} />
      <p className="line-clamp-3 text-sm text-neutral-700 dark:text-neutral-300">
        {sector.rationaleAdvanced}
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        근거 {sector.citations.length}건
      </p>
    </article>
  );
}
