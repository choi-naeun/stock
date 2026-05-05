-- Phase 1A 후속: Cloudflare Workers AI 폴백 제거.
-- llm_usage_log.provider 체크 제약을 'gemini' 단일로 좁힌다.
-- 기존 데이터에 'cloudflare' 행이 있으면 그대로 보존하되 신규 INSERT는 'gemini'만 허용.

alter table public.llm_usage_log
  drop constraint if exists llm_usage_log_provider_check;

alter table public.llm_usage_log
  add constraint llm_usage_log_provider_check
  check (provider in ('gemini'));
