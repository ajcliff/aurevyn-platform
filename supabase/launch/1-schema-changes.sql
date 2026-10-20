-- DRAFT, NOT APPLIED. Brings the PRODUCTION project's structure up to the development project.
-- Run in the PROD SQL Editor (jtxarxlzptqcwqliiilo) at launch, after reading README.md in this folder.
-- Safe to run once; uses "if not exists" where possible. Runs as one transaction: any error rolls everything back.
begin;

-- 1. Tables the emails and templates need
create table if not exists public.message_templates (
  id uuid not null default gen_random_uuid() primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null default 'credit_reminder',
  name text not null,
  subject text not null default '',
  body text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists message_templates_org_kind_idx on public.message_templates (org_id, kind);
alter table public.message_templates enable row level security;
drop policy if exists "Founder full access" on public.message_templates;
drop policy if exists "Org admins manage templates" on public.message_templates;
drop policy if exists "Org members read templates" on public.message_templates;
create policy "Founder full access" on public.message_templates for all using (is_founder()) with check (is_founder());
create policy "Org admins manage templates" on public.message_templates for all using (is_org_admin_or_owner(org_id)) with check (is_org_admin_or_owner(org_id));
create policy "Org members read templates" on public.message_templates for select using (is_org_member(org_id));

create table if not exists public.onboarding_emails_sent (
  org_id uuid not null references public.organizations(id) on delete cascade,
  step text not null,
  sent_at timestamptz not null default now(),
  primary key (org_id, step)
);
alter table public.onboarding_emails_sent enable row level security;
drop policy if exists "Founder full access" on public.onboarding_emails_sent;
create policy "Founder full access" on public.onboarding_emails_sent for all using (is_founder()) with check (is_founder());

-- 2. Staff usernames
alter table public.org_users add column if not exists username text;
create unique index if not exists org_users_username_lower_idx on public.org_users (lower(username)) where username is not null;

-- 3. Packages: new shape (slug, engine list, bundle flag)
alter table public.packages add column if not exists slug text;
alter table public.packages add column if not exists engine_slugs jsonb not null default '[]'::jsonb;
alter table public.packages add column if not exists requires_any_of jsonb not null default '[]'::jsonb;
alter table public.packages add column if not exists is_bundle boolean not null default false;
create unique index if not exists packages_slug_key on public.packages (slug);

-- 4. Founder-only policies without a hard-coded email, and org_id required
drop policy if exists founder_only on public.company_documents;
drop policy if exists "Founder full access" on public.company_documents;
create policy "Founder full access" on public.company_documents for all to authenticated using (is_founder()) with check (is_founder());
drop policy if exists founder_only on public.company_team_members;
drop policy if exists "Founder full access" on public.company_team_members;
create policy "Founder full access" on public.company_team_members for all to authenticated using (is_founder()) with check (is_founder());

alter table public.finance_accounts alter column org_id set not null;
alter table public.finance_cashflow alter column org_id set not null;
alter table public.finance_expenses alter column org_id set not null;
alter table public.finance_transactions alter column org_id set not null;
alter table public.ops_documents alter column org_id set not null;
alter table public.ops_projects alter column org_id set not null;
alter table public.ops_tasks alter column org_id set not null;
alter table public.ops_teams alter column org_id set not null;
alter table public.pos_returns alter column org_id set not null;
alter table public.commerce_promotions alter column org_id set not null;
alter table public.organization_engines alter column org_id set not null;

commit;

-- 5. STILL TO DO BY HAND (copy the function bodies from supabase/schema.sql, search for the names):
--    check_trial_status(), generate_subscription_invoices(), process_scheduled_platform_invoices()
--    Run each "CREATE OR REPLACE FUNCTION" block as it appears there. They are not repeated here so there is one source of truth.
