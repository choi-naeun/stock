import type { AnnotatedCitation } from '@stock-tracker/shared';

import { TierBadge } from './TierBadge';

export function CitationItem({ citation }: { citation: AnnotatedCitation }) {
  let host = '';
  try {
    host = new URL(citation.url).host;
  } catch {
    host = citation.url;
  }

  return (
    <li className="flex items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/50">
      <TierBadge tier={citation.tier} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-neutral-800 dark:text-neutral-100">{citation.quote}</p>
        <a
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs text-neutral-500 hover:text-blue-600 hover:underline dark:text-neutral-400 dark:hover:text-blue-400"
        >
          {host} ↗
        </a>
      </div>
    </li>
  );
}
