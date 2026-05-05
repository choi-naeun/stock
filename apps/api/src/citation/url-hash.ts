import { createHash } from 'node:crypto';

/**
 * Supabase의 `news_articles.url_hash` GENERATED 컬럼과 동일한 방식으로
 * SHA-256(url) 16진수 문자열을 산출한다. 두 곳이 같은 해시를 만들어야
 * corpus 멤버십 lookup이 정확하게 동작한다.
 */
export function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

/**
 * 트래킹·필터링 정확도를 위해 URL을 정규화한다.
 * - utm_*, gclid, fbclid 같은 트래킹 쿼리 제거
 * - 마지막 슬래시 제거
 * - hash fragment 제거
 * - host 소문자
 */
export function normalizeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return input;
  }
  url.hash = '';
  const skipParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
  for (const p of skipParams) url.searchParams.delete(p);
  url.host = url.host.toLowerCase();
  let out = url.toString();
  if (out.endsWith('/') && url.pathname !== '/') out = out.slice(0, -1);
  return out;
}
