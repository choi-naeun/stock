import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * 인증 콜백. 두 가지 흐름 모두 지원:
 *  - PKCE (`?code=...`) — 매직 링크 PKCE / OAuth
 *  - OTP token_hash (`?token_hash=...&type=...`) — 일부 매직 링크 / 이메일 변경 등
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') ?? '/dashboard';

  const supabase = await createClient();

  let authError: { message: string } | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) authError = error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'magiclink' | 'email' | 'recovery' | 'invite',
    });
    if (error) authError = error;
  } else {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('인증 코드가 없습니다')}`, url.origin),
    );
  }

  if (authError) {
    // enforce_allowlist 트리거가 화이트리스트 차단 시 발생.
    const friendly = authError.message.includes('allowlist')
      ? '초대받은 이메일만 접근할 수 있습니다. 관리자에게 문의하세요.'
      : authError.message;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(friendly)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
