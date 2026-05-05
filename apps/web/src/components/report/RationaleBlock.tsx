import type { GlossaryEntry } from '@stock-tracker/shared';

import { annotateTerms } from '@/lib/term-annotator';

interface Props {
  text: string;
  glossary: GlossaryEntry[];
}

export function RationaleBlock({ text, glossary }: Props) {
  const annotated = annotateTerms(text, glossary);
  return (
    <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
      {annotated.map((node, i) => (
        <span key={i}>{node}</span>
      ))}
    </p>
  );
}
