'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

import type { GlossaryEntry, SectorScore } from '@stock-tracker/shared';
import { cn } from '@/lib/utils';
import { CitationItem } from './CitationItem';
import { DirectionScoreGauge } from './DirectionScoreGauge';
import { RationaleBlock } from './RationaleBlock';

interface Props {
  sectors: SectorScore[];
  glossary: GlossaryEntry[];
}

export function SectorAccordion({ sectors, glossary }: Props) {
  return (
    <Accordion.Root type="multiple" className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {sectors.map((sector) => (
        <Accordion.Item key={sector.sectorCode} value={sector.sectorCode}>
          <Accordion.Header>
            <Accordion.Trigger
              className={cn(
                'group flex w-full items-center justify-between gap-4 py-4 text-left',
                'hover:bg-neutral-50 dark:hover:bg-neutral-900/40',
              )}
            >
              <div className="flex flex-1 items-center gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold">{sector.sectorNameKo}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {sector.sectorCode} · 근거 {sector.citations.length}건
                  </p>
                </div>
                <DirectionScoreGauge score={sector.directionScore} className="w-40" />
              </div>
              <ChevronDown
                className="size-4 shrink-0 text-neutral-400 transition-transform group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="space-y-4 pb-6 pt-2">
              <RationaleBlock text={sector.rationaleAdvanced} glossary={glossary} />
              {sector.citations.length > 0 ? (
                <ul className="space-y-2">
                  {sector.citations.map((c, idx) => (
                    <CitationItem key={`${c.url}-${idx}`} citation={c} />
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-neutral-500">근거가 등록되지 않았습니다.</p>
              )}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
