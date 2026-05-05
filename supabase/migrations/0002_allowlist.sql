-- Phase 0 — Email allowlist for closed-beta signup.
-- PRD Appendix C.5: signup is blocked unless the email is pre-registered by admin.

create table if not exists public.allowlisted_emails (
  email text primary key,
  note text,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.allowlisted_emails enable row level security;

-- Only service_role can read/write (managed via Supabase Studio or service-role scripts).
-- Normal users cannot inspect the allowlist.
create policy "allowlisted_emails_service_only"
  on public.allowlisted_emails for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Block signup of non-allowlisted emails.
-- Executed by the on_auth_user_created trigger chain (see 0001_users.sql).
create or replace function public.enforce_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowlisted_emails where lower(email) = lower(new.email)
  ) then
    raise exception 'Email % is not on the access allowlist', new.email
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_allowlist_trigger on auth.users;
create trigger enforce_allowlist_trigger
  before insert on auth.users
  for each row execute function public.enforce_allowlist();

-- Seed admin email. Replace via Supabase Studio if different.
insert into public.allowlisted_emails (email, note)
values ('hw.telos2@gmail.com', 'admin / PRD author')
on conflict (email) do nothing;
