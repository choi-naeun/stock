import { NoReportYet } from '@/components/report/NoReportYet';
import { ReportShell } from '@/components/report/ReportShell';
import { apiJson } from '@/lib/api-client';
import { publicEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import type { DailyReportEnvelope, GlossaryEntry } from '@stock-tracker/shared';

interface SearchParams {
  market?: string;
  debug?: string;
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
  const debug = params.debug === '1';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let reportError: string | null = null;
  let glossaryError: string | null = null;

  const [report, glossary] = await Promise.all([
    apiJson<ReportResponse>(`/reports/today?market=${market}`).catch((e: unknown) => {
      reportError = e instanceof Error ? e.message : String(e);
      return null;
    }),
    apiJson<GlossaryEntry[]>('/glossary').catch((e: unknown) => {
      glossaryError = e instanceof Error ? e.message : String(e);
      return [] as GlossaryEntry[];
    }),
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

      {debug && (
        <pre className="mb-6 max-w-full overflow-x-auto rounded-md bg-neutral-100 p-4 text-xs dark:bg-neutral-900">
{JSON.stringify(
  {
    publicEnv: {
      NEXT_PUBLIC_API_URL: publicEnv.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_SUPABASE_URL: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    },
    sessionPresent: !!session,
    accessTokenLength: session?.access_token?.length ?? 0,
    reportError,
    glossaryError,
    reportStatus: report && 'status' in report ? report.status : null,
    reportHasPayload: !!(report && 'payload' in report && report.payload),
  },
  null,
  2,
)}
        </pre>
      )}

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
