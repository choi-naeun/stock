-- Phase 0 — Glossary table.
-- PRD F9: terms are served via GlossaryModule with expert/intermediate/beginner definitions.
-- LLM does NOT generate these at runtime; all definitions are authored and stored in DB
-- to guarantee consistency and prevent hallucination.

create table if not exists public.glossary (
  term text primary key,
  term_en text,
  category text not null check (category in ('indicator', 'market', 'macro', 'corporate', 'derivative')),
  definition_advanced text not null,
  definition_intermediate text not null,
  definition_beginner text not null,
  examples text[] not null default '{}',
  related_terms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.glossary enable row level security;

-- Read: any authenticated user can fetch glossary entries.
create policy "glossary_select_authenticated"
  on public.glossary for select
  to authenticated
  using (true);

-- Write: service role only.
create policy "glossary_write_service_only"
  on public.glossary for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists glossary_term_lower_idx on public.glossary (lower(term));
create index if not exists glossary_category_idx on public.glossary (category);
