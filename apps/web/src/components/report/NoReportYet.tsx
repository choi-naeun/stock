interface Props {
  marketScope: 'kr' | 'us';
  status?: string;
}

export function NoReportYet({ marketScope, status }: Props) {
  const scopeLabel = marketScope === 'kr' ? '국내 (KR)' : '해외 (US)';
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-lg font-semibold">아직 발행된 리포트가 없습니다</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {scopeLabel} 리포트는 매일 KST 07:00에 자동 발행됩니다.
        {status && status !== 'published' && (
          <span className="ml-1">
            (현재 상태: <code className="font-mono text-xs">{status}</code>)
          </span>
        )}
      </p>
    </div>
  );
}
