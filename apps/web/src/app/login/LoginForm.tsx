'use client';

import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('sending');
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
          // 가입 자체는 0002 마이그레이션의 enforce_allowlist 트리거가 화이트리스트로 차단.
          shouldCreateUser: true,
        },
      });
      if (otpError) {
        setStatus('error');
        setError(otpError.message);
        return;
      }
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950">
        <p className="font-medium text-green-900 dark:text-green-100">
          {email}로 로그인 링크를 보냈습니다.
        </p>
        <p className="text-green-800 dark:text-green-200">
          메일함을 확인하고 링크를 누르면 자동으로 로그인됩니다. 링크는 1시간 동안 유효합니다.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="text-xs text-green-700 underline hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
        >
          다른 이메일로 다시 시도
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <label className="block text-sm font-medium" htmlFor="email">
        이메일
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
        disabled={status === 'sending'}
      />
      <button
        type="submit"
        disabled={status === 'sending' || !email.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
      >
        {status === 'sending' ? '메일 발송 중...' : '로그인 링크 받기'}
      </button>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
