import type { DailyReportPayload } from '@stock-tracker/shared';

interface Props {
  payload: DailyReportPayload;
}

export function MarketSummaryHeader({ payload }: Props) {
  const publishedKst = new Date(payload.publishedAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {payload.marketScope === 'kr' ? '국내 (KR · WICS)' : '해외 (US · GICS)'} 일일 리포트
      </p>
      <h1 className="text-3xl font-semibold">{payload.reportDate}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        발행 {publishedKst} · 인용 {payload.metadata.citationCount}건 · LLM{' '}
        {payload.metadata.llmProviderUsed}
      </p>
      {payload.marketSummary.indices.length > 0 && (
        <ul className="flex flex-wrap gap-3 pt-2">
          {payload.marketSummary.indices.map((idx) => (
            <li
              key={idx.symbol}
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-800"
            >
              <span className="font-medium">{idx.name}</span>{' '}
              <span className="text-neutral-500 dark:text-neutral-400">
                {idx.lastClose !== null ? idx.lastClose.toLocaleString('ko-KR') : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
