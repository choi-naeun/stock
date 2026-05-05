-- Phase 1A — F2/F5 ReportModule.
-- 일일 발행되는 섹터 리포트. payload(JSONB)는 화면 렌더용 캐시,
-- report_sector_scores는 분석·감사용 정규화 행. RLS는 published만 사용자에게 노출.

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  market_scope text not null check (market_scope in ('kr', 'us')),
  status text not null check (status in ('pending', 'generating', 'published', 'failed')) default 'pending',
  published_at timestamptz,
  payload jsonb,
  metadata jsonb not null default '{}'::jsonb,
  generation_log_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_date, market_scope)
);

alter table public.daily_reports enable row level security;

-- 사용자: published 상태만 조회 가능. pending/generating/failed는 가림.
create policy "daily_reports_select_published"
  on public.daily_reports for select
  to authenticated
  using (status = 'published');

create policy "daily_reports_write_service"
  on public.daily_reports for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists daily_reports_date_idx on public.daily_reports (report_date desc, market_scope);
create index if not exists daily_reports_status_idx on public.daily_reports (status, report_date desc);

create table if not exists public.report_sector_scores (
  id bigserial primary key,
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  taxonomy text not null check (taxonomy in ('WICS', 'GICS')),
  sector_code text not null,
  sector_name_ko text not null,
  direction_score smallint check (direction_score is null or direction_score between -5 and 5),
  citations jsonb not null default '[]'::jsonb,
  rank_top integer,
  rank_bottom integer,
  rationale_advanced text not null,
  rationale_neutral text,
  created_at timestamptz not null default now()
);

alter table public.report_sector_scores enable row level security;

create policy "report_sector_scores_select_via_report"
  on public.report_sector_scores for select
  to authenticated
  using (
    exists (
      select 1 from public.daily_reports r
      where r.id = report_sector_scores.report_id and r.status = 'published'
    )
  );

create policy "report_sector_scores_write_service"
  on public.report_sector_scores for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists report_sector_scores_report_idx on public.report_sector_scores (report_id);
create index if not exists report_sector_scores_taxonomy_idx on public.report_sector_scores (taxonomy, sector_code);
