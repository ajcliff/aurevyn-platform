-- New seat tiers (3, 10, 25, 50, 100, unlimited) and higher prices. Run in the DEV project's SQL Editor.
-- The website, signup and billing read these rows, so nothing else needs changing.
begin;
delete from public.engine_license_tiers;
insert into public.engine_license_tiers (engine_id, seats, price)
select e.id, p.seats, p.price from (values
  ('finance',3,3500),('finance',10,9500),('finance',25,20000),('finance',50,34000),('finance',100,55000),('finance',999999,48000),
  ('pos',3,2800),('pos',10,7500),('pos',25,16000),('pos',50,27000),('pos',100,44000),('pos',999999,38000),
  ('inventory',3,2800),('inventory',10,7500),('inventory',25,16000),('inventory',50,27000),('inventory',100,44000),('inventory',999999,38000),
  ('ai-insights',3,2800),('ai-insights',10,7500),('ai-insights',25,16000),('ai-insights',50,27000),('ai-insights',100,44000),('ai-insights',999999,38000),
  ('hr-payroll',3,2200),('hr-payroll',10,6000),('hr-payroll',25,13000),('hr-payroll',50,22000),('hr-payroll',100,36000),('hr-payroll',999999,30000),
  ('crm',3,1800),('crm',10,5000),('crm',25,11000),('crm',50,18500),('crm',100,30000),('crm',999999,26000),
  ('analytics',3,1500),('analytics',10,4000),('analytics',25,8500),('analytics',50,14500),('analytics',100,24000),('analytics',999999,20000),
  ('automation',3,1500),('automation',10,4000),('automation',25,8500),('automation',50,14500),('automation',100,24000),('automation',999999,20000),
  ('business-ops',3,1500),('business-ops',10,4000),('business-ops',25,8500),('business-ops',50,14500),('business-ops',100,24000),('business-ops',999999,20000),
  ('procurement',3,1500),('procurement',10,4000),('procurement',25,8500),('procurement',50,14500),('procurement',100,24000),('procurement',999999,20000)
) as p(slug, seats, price) join public.engines e on e.slug = p.slug;
commit;
select count(*) as rows_should_be_60 from public.engine_license_tiers;
