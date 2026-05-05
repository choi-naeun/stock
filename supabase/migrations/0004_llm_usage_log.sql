-- Phase 0 — LLM usage tracking.
-- PRD Appendix C.4: track daily Gemini / Cloudflare usage against free-tier quotas.

create table if not exists public.llm_usage_log (
  id bigserial primary key,
  provider text not null check (provider in ('gemini', 'cloudflare')),
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  latency_ms integer not null default 0,
  success boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.llm_usage_log enable row level security;

-- Only service role writes/reads. No user-facing exposure.
create policy "llm_usage_log_service_only"
  on public.llm_usage_log for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists llm_usage_log_created_at_idx on public.llm_usage_log (created_at desc);
create index if not exists llm_usage_log_provider_idx on public.llm_usage_log (provider, created_at desc);

-- Daily aggregate view for cron-based quota monitoring.
create or replace view public.llm_usage_daily as
select
  date_trunc('day', created_at at time zone 'Asia/Seoul') as day_kst,
  provider,
  count(*) filter (where success) as requests_success,
  count(*) filter (where not success) as requests_failed,
  coalesce(sum(prompt_tokens), 0) as total_prompt_tokens,
  coalesce(sum(completion_tokens), 0) as total_completion_tokens,
  coalesce(avg(latency_ms)::int, 0) as avg_latency_ms
from public.llm_usage_log
group by day_kst, provider
order by day_kst desc, provider;
