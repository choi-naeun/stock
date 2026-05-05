import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? decodeURIComponent(params.error) : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">stock-tracker</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            초대받은 이메일만 접근할 수 있습니다.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <LoginForm nextPath={params.next ?? '/dashboard'} />

        <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          본 서비스는 정보 큐레이션 목적이며 자본시장법상 투자자문업이 아닙니다. 투자 결정과 그
          결과에 대한 책임은 사용자 본인에게 있습니다.
        </p>
      </div>
    </main>
  );
}
