-- Phase 1A — F1 IngestionModule.
-- 일일 RSS / 공시 수집 결과를 저장. 본문은 절대 저장하지 않으며 title+description만 보관.
-- 모든 테이블은 service_role 전용 (사용자에게 노출 X).

create extension if not exists pgcrypto;

-- 1. news_sources: 등록된 매체·공시 채널 카탈로그
create table if not exists public.news_sources (
  code text primary key,
  display_name text not null,
  region text not null check (region in ('kr', 'us', 'global')),
  source_type text not null check (source_type in ('news', 'filing')),
  trust_tier text not null check (trust_tier in ('verified', 'community', 'unverified')) default 'verified',
  rss_url text,
  robots_checked_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_sources enable row level security;

create policy "news_sources_service_only"
  on public.news_sources for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 2. news_articles: 수집된 기사·공시. title+description만 저장 (저작권 안전지대).
create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  source_code text not null references public.news_sources(code) on delete restrict,
  external_id text not null,
  url text not null,
  url_hash text generated always as (encode(digest(url, 'sha256'), 'hex')) stored,
  title text not null,
  summary text,
  published_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  language text not null check (language in ('ko', 'en')),
  sector_tags text[] not null default '{}',
  unique (source_code, external_id)
);

alter table public.news_articles enable row level security;

create policy "news_articles_service_only"
  on public.news_articles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists news_articles_url_hash_idx on public.news_articles (url_hash);
create index if not exists news_articles_published_at_idx on public.news_articles (published_at desc);
create index if not exists news_articles_source_code_idx on public.news_articles (source_code, published_at desc);
create index if not exists news_articles_sector_tags_gin on public.news_articles using gin (sector_tags);

-- 3. ingestion_runs: 실행 기록. 한 매체 실패가 다른 매체를 막지 않는 partial 상태 분기 가능.
create table if not exists public.ingestion_runs (
  id bigserial primary key,
  source_code text not null references public.news_sources(code) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  inserted_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  status text not null check (status in ('running', 'success', 'partial', 'failed')) default 'running',
  error_summary text
);

alter table public.ingestion_runs enable row level security;

create policy "ingestion_runs_service_only"
  on public.ingestion_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists ingestion_runs_started_at_idx on public.ingestion_runs (started_at desc);
create index if not exists ingestion_runs_source_started_idx on public.ingestion_runs (source_code, started_at desc);

-- 일일 집계 view: 운영 모니터링·실패 알림용
create or replace view public.ingestion_runs_daily as
select
  date_trunc('day', started_at at time zone 'Asia/Seoul') as day_kst,
  source_code,
  count(*) filter (where status = 'success') as runs_success,
  count(*) filter (where status = 'partial') as runs_partial,
  count(*) filter (where status = 'failed') as runs_failed,
  coalesce(sum(inserted_count), 0) as total_inserted,
  coalesce(sum(error_count), 0) as total_errors,
  max(started_at) as last_run_at
from public.ingestion_runs
group by day_kst, source_code
order by day_kst desc, source_code;

-- 4. 시드 데이터: PRD에서 합의된 무료·공식 채널만.
insert into public.news_sources (code, display_name, region, source_type, trust_tier, rss_url) values
  ('yna', '연합뉴스 경제', 'kr', 'news', 'verified', 'https://www.yna.co.kr/rss/economy.xml'),
  ('hankyung', '한국경제 경제', 'kr', 'news', 'verified', 'https://www.hankyung.com/feed/economy'),
  ('mk', '매일경제 경제', 'kr', 'news', 'verified', 'https://www.mk.co.kr/rss/40300001/'),
  ('mt', '머니투데이 증권', 'kr', 'news', 'verified', 'https://rss.mt.co.kr/mt_stock.xml'),
  ('yahoo', 'Yahoo Finance', 'us', 'news', 'verified', 'https://finance.yahoo.com/news/rssindex'),
  ('seekingalpha', 'Seeking Alpha Market Currents', 'us', 'news', 'verified', 'https://seekingalpha.com/market_currents.xml'),
  ('dart', 'DART 전자공시', 'kr', 'filing', 'verified', null),
  ('sec', 'SEC EDGAR', 'us', 'filing', 'verified', null)
on conflict (code) do nothing;
