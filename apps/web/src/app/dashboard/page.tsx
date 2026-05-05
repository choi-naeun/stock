import { NoReportYet } from '@/components/report/NoReportYet';
import { ReportShell } from '@/components/report/ReportShell';
import { apiJson } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/server';
import type { DailyReportEnvelope, GlossaryEntry } from '@stock-tracker/shared';

interface SearchParams {
  market?: string;
}

type ReportResponse =
  | DailyReportEnvelope
  | { status: string; marketScope: 'kr' | 'us' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const market: 'kr' | 'us' = params.market === 'us' ? 'us' : 'kr';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [report, glossary] = await Promise.all([
    apiJson<ReportResponse>(`/reports/today?market=${market}`).catch(() => null),
    apiJson<GlossaryEntry[]>('/glossary').catch(() => [] as GlossaryEntry[]),
  ]);

  const isPublished =
    report &&
    'payload' in report &&
    report.payload &&
    report.status === 'published';

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <p>{user?.email}</p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="hover:underline">
            로그아웃
          </button>
        </form>
      </div>

      {isPublished && report && 'payload' in report && report.payload ? (
        <ReportShell payload={report.payload} glossary={glossary} />
      ) : (
        <NoReportYet
          marketScope={market}
          status={report && 'status' in report ? report.status : undefined}
        />
      )}
    </main>
  );
}
