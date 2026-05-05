import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';

/**
 * Server Component / Route Handler 에서 사용할 fetch wrapper.
 * 현재 사용자의 Supabase access token을 Bearer로 첨부하여 NestJS API에 호출.
 * 토큰이 없으면 그대로 호출 (NestJS Guard가 401 반환).
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = `${publicEnv.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}${path}`;
  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}
