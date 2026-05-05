-- Phase 1A — F4 CitationModule.
-- 인용된 URL의 검증 결과를 24시간 캐시. corpus 멤버십 + HTTP HEAD 결과 결합으로 tier 산출.
-- AnalysisModule 응답의 모든 인용은 이 테이블의 검증을 거쳐야 사용자에게 노출 가능.

create table if not exists public.url_verifications (
  url_hash text primary key,
  url text not null,
  in_corpus boolean not null,
  http_status integer,
  last_checked_at timestamptz not null default now(),
  tier text not null check (tier in ('verified', 'community', 'unverified'))
);

alter table public.url_verifications enable row level security;

create policy "url_verifications_service_only"
  on public.url_verifications for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists url_verifications_last_checked_idx on public.url_verifications (last_checked_at desc);
create index if not exists url_verifications_tier_idx on public.url_verifications (tier);
