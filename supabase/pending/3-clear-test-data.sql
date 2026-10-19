-- Uploaded files cannot be deleted with SQL (Supabase blocks it). Empty the two buckets first in the dashboard:
--   Storage > documents > select all > Delete, then Storage > org-logos > select all > Delete.
-- DESTRUCTIVE. Clears all organizations and everything in them, test sign-ups
-- from the DEV project. Keeps the founder account, engines, packages, pricing, themes,
-- payment providers and the founder's own company records. Never run on production.
do $$
declare tbls text;
begin
  select string_agg(format('public.%I', tablename), ', ') into tbls
  from pg_tables
  where schemaname='public'
    and tablename not in ('blueprint_engines','blueprints','engine_license_tiers','engines','founder_settings','modules','packages','payment_providers','theme_presets','security_rules','site_announcements','roadmap_items','company_documents','company_expenses','company_profile','company_team_members','maintenance_items','scheduled_company_expenses');
  execute 'truncate table '||tbls||' restart identity cascade';
  delete from auth.users where id not in (select user_id from founder_settings);
end $$;
select (select count(*) from auth.users) users, (select count(*) from organizations) orgs, (select count(*) from engines) engines, (select count(*) from engine_license_tiers) tiers;
