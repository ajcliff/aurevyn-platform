-- DRAFT, NOT APPLIED. Reference data the product reads (production currently has none of it: 0 engines, 0 prices, 0 blueprints).
-- Run AFTER 1-schema-changes.sql. Safe to re-run (updates by slug).
begin;

insert into public.engines (id, name, slug, description, category, tier, status, version, icon, monthly_price) values
 ('e75fc11a-26ae-4a99-b880-e2982f18d5fa','Point of Sale','pos','Sales processing, receipts and M-Pesa integration','retail','tier2','active','1.0.0','🛒',1200),
 ('e4faee57-fb7c-4523-aad5-b9d2f7e7c78e','Inventory','inventory','Stock management, movements, warehouses and low stock alerts','retail','tier2','active','1.0.0','📦',1000),
 ('6c341369-f515-417b-8085-df61b3d1d1ab','Finance','finance','Income, expenses, cashflow, invoicing and ledger management','core','tier1','active','1.0.0','💰',1200),
 ('38076247-1574-4b6b-9823-8e9955ebd5c6','HR & Payroll','hr-payroll','Staff management, payroll, NSSF, NHIF and PAYE compliance','core','tier1','active','1.0.0','👥',1000),
 ('26dafa88-a3cd-46f6-9b35-05dcb31dcf8d','CRM','crm','Leads, customers, sales pipeline and follow-up management','core','tier1','active','1.0.0','🤝',1000),
 ('047afc1b-328c-4ed1-a432-43dc29781656','Analytics','analytics','Revenue charts, trends, reports and business intelligence','intelligence','tier1','active','1.0.0','📊',800),
 ('07494d01-0f18-4545-939d-f026e8628bee','Procurement','procurement','Purchase orders, suppliers and procurement workflows','retail','tier2','active','1.0.0','🔄',800),
 ('2085e76a-12ae-4c03-9dbe-82b0978e064a','Business Operations','business-ops','Projects, tasks, departments, teams and internal communication','core','tier1','active','1.0.0','⚙',800),
 ('8f9aa6e1-dd8e-4ea6-8c9b-49f1c95c95ec','AI Insights','ai-insights','Predictive analytics, AI recommendations and intelligent agents','intelligence','tier2','active','1.0.0','✦',1500),
 ('843db0f0-300e-438c-b830-5c6ba759ab68','Automation','automation','Scheduled invoices, purchase orders, and recurring platform tasks.','insights','tier2','active','1.0.0','⚙',800)
on conflict (id) do nothing;

-- Seat tiers (same rows as supabase/pending/1-new-prices-and-seats.sql)
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

-- Industry blueprints (the signup page offers Retail and General Business today)
insert into public.blueprints (id, name, slug, industry, description, icon, color, recommended_tier, config) values
 ('e36f84e9-b83d-4174-8547-3a3dc149dc4e','Retail','retail','Retail & Commerce','For shops, supermarkets, hardware stores and distributors','🏪','#3dd68c','Biashara','{"kpis":["sell_through_rate","stockout_rate","daily_sales"],"engines":{"pos":true,"commerce":true,"inventory":true,"manufacturing":false},"modules":{"lotTracking":false,"serialTracking":false,"barcodeScanning":true},"dashboardWidgets":["sales_today","stock_alerts","top_products"]}'),
 ('13583878-3aa3-406c-85d7-2fa6a2866206','Clinic','clinic','Healthcare','For clinics, medical centers and pharmacies','🏥','#ef4444','Kampuni','{"kpis":["bed_occupancy","critical_drug_stockout"],"engines":{"pos":false,"commerce":false,"inventory":true,"manufacturing":false},"modules":{"expiryDates":true,"lotTracking":true,"serialTracking":true},"dashboardWidgets":["stock_expiry_alerts","patient_registry","cash_position"]}'),
 ('4429bf2e-c60d-44c5-83bb-19ffc3066d9d','School','school','Education','For schools, colleges and training institutions','🎓','#a78bfa','Biashara','{"kpis":["fee_collection_rate","enrollment_trend"],"engines":{"pos":false,"commerce":false,"inventory":true,"manufacturing":false},"modules":{"feeBilling":true,"studentRegistry":true},"dashboardWidgets":["fee_collection","enrollment","attendance"]}'),
 ('a7984bfc-c8d0-4aa1-8258-774a2ef3933a','SACCO','sacco','Finance & Cooperatives','For SACCOs, investment groups and cooperatives','🏦','#38bdf8','Kampuni','{"kpis":["npl_ratio","loan_book_growth"],"engines":{"pos":false,"commerce":false,"inventory":false,"manufacturing":false},"modules":{"loanBook":true,"memberRegistry":true},"dashboardWidgets":["loan_book_health","member_savings","repayments_due"]}'),
 ('4968e7ad-72b9-412d-ac2e-1c16fe341411','Property','property','Real Estate','For property managers, landlords and agencies','🏠','#ec4899','Kampuni','{"kpis":["occupancy_rate","rent_collection_rate"],"engines":{"pos":false,"commerce":false,"inventory":true,"manufacturing":false},"modules":{"rentRoll":true,"propertyRegistry":true},"dashboardWidgets":["occupancy","rent_collection","arrears"]}'),
 ('b21c6f3b-e62d-4fb8-9433-ef54bce2297a','Startup','startup','General Business','For startups and small teams getting started','🚀','#c9a84c','Msingi','{"kpis":["cash_runway","burn_rate"],"engines":{"pos":false,"commerce":false,"inventory":false,"manufacturing":false},"modules":{},"dashboardWidgets":["cash_position","runway"]}'),
 ('3c551ef2-25bc-413f-9142-f59094c0d66e','SME','sme','General Business','For growing businesses needing full operations management','🏢','#f59e0b','Biashara','{"kpis":["cash_position","stockout_rate"],"engines":{"pos":true,"commerce":false,"inventory":true,"manufacturing":false},"modules":{"barcodeScanning":true},"dashboardWidgets":["sales_today","cash_position","stock_alerts"]}')
on conflict (id) do nothing;

insert into public.blueprint_engines (blueprint_id, engine_id, required)
select b.id, e.id, true from (values
 ('retail','pos'),('retail','inventory'),('retail','finance'),('retail','crm'),
 ('school','hr-payroll'),('school','finance'),
 ('clinic','finance'),('clinic','inventory'),('clinic','hr-payroll'),
 ('sacco','finance'),('sacco','analytics'),
 ('startup','crm'),('startup','finance'),('startup','business-ops'),('startup','ai-insights'),
 ('sme','crm'),('sme','finance'),('sme','hr-payroll'),('sme','business-ops'),
 ('property','finance'),('property','crm')
) v(bp, eng) join public.blueprints b on b.slug = v.bp join public.engines e on e.slug = v.eng
where not exists (select 1 from public.blueprint_engines x where x.blueprint_id = b.id and x.engine_id = e.id);

-- Packages shown on pricing and signup
insert into public.packages (name, price, slug, engine_slugs, requires_any_of, is_bundle) values
 ('Inventory',1700,'inventory','["inventory","procurement"]','[]',false),
 ('Finance',2200,'finance','["finance"]','[]',false),
 ('Core Bundle',4700,'core_bundle','["pos","inventory","procurement","finance"]','[]',true),
 ('HR',2000,'hr','["hr-payroll"]','[]',false),
 ('CRM',1500,'crm','["crm"]','[]',false),
 ('Insights & Automation',1800,'insights_automation','["analytics","ai-insights","business-ops","automation"]','["pos","inventory","finance","hr","crm","core_bundle"]',false),
 ('Whole System',9000,'whole_system','["pos","inventory","procurement","finance","hr-payroll","crm","analytics","ai-insights","business-ops","automation"]','[]',true),
 ('POS',1700,'pos','["pos"]','[]',false)
on conflict (slug) do update set name=excluded.name, price=excluded.price, engine_slugs=excluded.engine_slugs, requires_any_of=excluded.requires_any_of, is_bundle=excluded.is_bundle;

-- Colour themes
insert into public.theme_presets (name, description, bg_base, bg_surface, bg_elevated, bg_card, bg_hover, border, border_light, gold, gold_light, gold_dim, text_primary, text_secondary, text_muted, green, amber, red) values
 ('Nairobi Night','Slate blue and electric teal','#0B1218','#101A22','#17232E','#121D26','#1C2B38','#243543','#35495B','#2DD4BF','#5EEAD4','#0F766E','#E6F1F5','#8FA6B3','#5B7282','#4ADE80','#FBBF24','#F87171'),
 ('Mara Dawn','Warm cream and terracotta (light)','#FAF6F0','#F3ECE2','#FFFFFF','#FFFFFF','#EFE5D8','#E0D4C3','#CDBBA3','#C2410C','#EA580C','#FDBA74','#2A1B12','#6B5646','#8F7C6B','#2F7D4F','#B45309','#B91C1C'),
 ('Kilimanjaro','Ice white and indigo (light)','#F4F7FB','#EAF0F8','#FFFFFF','#FFFFFF','#E1EAF5','#D3DEEC','#B8C8DE','#4F46E5','#6366F1','#C7D2FE','#0F172A','#475569','#64748B','#15803D','#B45309','#B91C1C'),
 ('Lamu Sunset','Warm charcoal and orange','#161412','#1E1B18','#28241F','#1B1815','#322D27','#3A342D','#504840','#F97316','#FB923C','#9A3412','#F5EFE8','#B1A599','#7C7165','#7CB872','#FACC15','#EF4444'),
 ('Tsavo Green','Deep forest and lime','#0A1410','#0F1C16','#16271F','#0D1913','#1D3329','#234034','#335A48','#A3E635','#BEF264','#4D7C0F','#E8F3EC','#8FB09D','#5D8070','#34D399','#FBBF24','#F87171'),
 ('Swahili Coast','Sea mist and deep teal (light)','#F2F8F7','#E5F1EF','#FFFFFF','#FFFFFF','#D9EBE8','#C6DFDB','#A6CBC5','#0F766E','#14B8A6','#99F6E4','#0B2A27','#3F625E','#5E807C','#15803D','#B45309','#B91C1C'),
 ('Midnight Mono','Near-black and silver','#0A0A0B','#111113','#1A1A1D','#131316','#222226','#2A2A2F','#3C3C43','#E4E4E7','#FAFAFA','#71717A','#FAFAFA','#A1A1AA','#71717A','#4ADE80','#FBBF24','#F87171'),
 ('Rose Quartz','Blush and berry (light)','#FBF5F7','#F5E9EE','#FFFFFF','#FFFFFF','#F0DEE6','#E8D2DC','#D6B3C4','#BE185D','#DB2777','#FBCFE8','#2B1220','#6E4A5D','#8C6A7B','#15803D','#B45309','#B91C1C');

-- Payment providers list
insert into public.payment_providers (code, name, description, supports_stk_push, supports_cards, supports_bank, active) values
 ('daraja','Safaricom Daraja','M-Pesa STK Push and C2B/B2C',true,false,false,true),
 ('stripe','Stripe','Global card payments',false,true,true,true),
 ('flutterwave','Flutterwave','African payment gateway',true,true,true,true),
 ('pesapal','Pesapal','East African payment gateway',true,true,true,true);

commit;
select (select count(*) from engines) engines_10, (select count(*) from engine_license_tiers) tiers_60, (select count(*) from blueprints) blueprints_7, (select count(*) from blueprint_engines) links_21, (select count(*) from packages) packages_8;
