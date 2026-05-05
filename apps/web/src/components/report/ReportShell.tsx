import type { DailyReportPayload, GlossaryEntry, SectorScore } from '@stock-tracker/shared';

import { MarketSummaryHeader } from './MarketSummaryHeader';
import { SectorAccordion } from './SectorAccordion';
import { SectorCard } from './SectorCard';

interface Props {
  payload: DailyReportPayload;
  glossary: GlossaryEntry[];
}

export function ReportShell({ payload, glossary }: Props) {
  const top = byCodes(payload.scores, payload.top5);
  const bottom = byCodes(payload.scores, payload.bottom5);

  return (
    <div className="space-y-10">
      <MarketSummaryHeader payload={payload} />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">주목 섹터 Top {top.length}</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {top.map((sector, i) => (
            <SectorCard key={sector.sectorCode} sector={sector} variant="top" rank={i + 1} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">주의 섹터 Bottom {bottom.length}</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {bottom.map((sector, i) => (
            <SectorCard key={sector.sectorCode} sector={sector} variant="bottom" rank={i + 1} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">섹터별 상세</h2>
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 dark:border-neutral-800 dark:bg-neutral-900">
          <SectorAccordion sectors={payload.scores} glossary={glossary} />
        </div>
      </section>

      <footer className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
        본 서비스는 정보 큐레이션 목적이며 자본시장법상 투자자문업이 아닙니다. 모든 리포트는
        참고 자료이며, 투자 결정과 그 결과에 대한 책임은 사용자 본인에게 있습니다.
      </footer>
    </div>
  );
}

function byCodes(scores: SectorScore[], codes: string[]): SectorScore[] {
  const map = new Map(scores.map((s) => [s.sectorCode, s]));
  return codes.map((c) => map.get(c)).filter((s): s is SectorScore => Boolean(s));
}
