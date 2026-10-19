-- Replace the two policies that hard-code the founder's email with the standard founder check,
-- and make org_id required on tables that belong to an organization. Run in the DEV project's SQL Editor.
begin;
drop policy if exists founder_only on public.company_documents;
create policy "Founder full access" on public.company_documents for all to authenticated using (is_founder()) with check (is_founder());
drop policy if exists founder_only on public.company_team_members;
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
