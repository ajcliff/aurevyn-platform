-- =====================================================================
-- AUREVYN database schema (reference snapshot)
--
-- Generated from the Supabase DEV project. It describes:
--   * 117 tables in the public schema (columns, types, defaults)
--   * 27 functions, 9 triggers, 1 view, 2 sequences
--   * row-level-security policies for every table + storage policies
--   * scheduled (cron) jobs
--
-- Intentionally NOT included (to keep this readable):
--   * foreign keys, check constraints, unique constraints, indexes
--   * Supabase's own schemas (auth, storage internals)
--   * any data
--
-- This is for READING / reviewing the design. The running database is the
-- source of truth. Placeholders in angle brackets, e.g. <PROJECT_REF>,
-- <ANON_KEY>, must be filled in before anything is run.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

create sequence if not exists public.invoice_no_seq;
create sequence if not exists public.receipt_no_seq;

-- =====================================================================
-- TABLES
-- =====================================================================
create table public.account_reconciliations (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  finance_account_id uuid not null,
  as_of date not null default CURRENT_DATE,
  book_balance numeric not null,
  actual_balance numeric not null,
  difference numeric not null,
  adjusted boolean not null default false,
  note text,
  recorded_by text,
  created_at timestamp with time zone not null default now()
);
create table public.activities (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  customer_id uuid not null,
  type text not null,
  notes text,
  created_at timestamp with time zone not null default now()
);
create table public.activity (
  id uuid not null default gen_random_uuid(),
  icon text,
  title text not null,
  sub text,
  created_at timestamp with time zone default now(),
  org_id uuid,
  user_id uuid,
  user_name text
);
create table public.ai_decisions (
  id uuid not null default gen_random_uuid(),
  decision_type text not null,
  confidence numeric default 0,
  action text,
  reason text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);
create table public.approval_requests (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  requested_by_user_id uuid,
  requested_by_name text,
  type text not null,
  title text not null,
  description text,
  amount numeric,
  status text not null default 'pending'::text,
  decided_by_name text,
  decided_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  source text default 'manual'::text,
  related_id uuid,
  last_reminded_at timestamp with time zone,
  approvers_notified_at timestamp with time zone,
  requester_notified_at timestamp with time zone,
  department_id uuid,
  stage text not null default 'final'::text,
  dept_head_user_id uuid,
  dept_decided_by_name text,
  dept_decided_at timestamp with time zone,
  attachments jsonb not null default '[]'::jsonb
);
create table public.audit_trail (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  amount numeric,
  status text not null default 'completed'::text,
  initiated_by_id uuid,
  initiated_by_name text not null,
  initiated_at timestamp with time zone not null default now(),
  authorised_by_name text,
  authorised_at timestamp with time zone,
  authorisation text,
  approval_request_id uuid,
  created_at timestamp with time zone not null default now()
);
create table public.blocked_ips (
  id uuid not null default gen_random_uuid(),
  ip text not null,
  reason text,
  blocked_at timestamp with time zone default now()
);
create table public.blueprint_engines (
  id uuid not null default gen_random_uuid(),
  blueprint_id uuid,
  engine_id uuid,
  required boolean default true
);
create table public.blueprints (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  industry text not null,
  description text,
  icon text default '📋'::text,
  color text default '#c9a84c'::text,
  recommended_tier text default 'Biashara'::text,
  created_at timestamp with time zone default now(),
  config jsonb not null default '{}'::jsonb
);
create table public.broadcasts (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  sender_user_id uuid not null,
  sender_name text,
  title text not null,
  message text not null,
  audience_type text not null default 'all'::text,
  audience_value text,
  created_at timestamp with time zone not null default now()
);
create table public.chart_of_accounts (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  code text not null,
  name text not null,
  account_type text not null,
  parent_id uuid,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.commerce_coupons (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  code text not null,
  name text not null,
  type text not null,
  value numeric(12,2) not null,
  minimum_order numeric(12,2) default 0,
  usage_limit integer default 0,
  usage_count integer default 0,
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  active boolean default true,
  created_at timestamp with time zone default now()
);
create table public.commerce_promotions (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  name text not null,
  type text not null,
  value numeric not null,
  active boolean default true,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
create table public.commerce_rules (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  engine text not null,
  priority integer default 100,
  active boolean default true,
  name text not null,
  condition jsonb not null,
  action jsonb not null,
  created_at timestamp with time zone default now()
);
create table public.company_documents (
  id uuid not null default gen_random_uuid(),
  title text not null,
  doc_type text not null default 'other'::text,
  reference text,
  issued_on date,
  expires_on date,
  link text,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
create table public.company_expenses (
  id uuid not null default gen_random_uuid(),
  date date not null,
  category text not null default 'other'::text,
  vendor text,
  description text not null,
  amount numeric not null,
  currency text not null default 'KES'::text,
  notes text,
  created_at timestamp with time zone not null default now()
);
create table public.company_profile (
  id uuid not null default gen_random_uuid(),
  legal_name text not null default ''::text,
  trading_name text,
  registration_number text,
  tax_pin text,
  company_type text,
  industry text,
  description text,
  website text,
  official_email text,
  phone text,
  registered_address text,
  country text not null default 'Kenya'::text,
  currency text not null default 'KES'::text,
  timezone text not null default 'Africa/Nairobi'::text,
  updated_at timestamp with time zone not null default now()
);
create table public.company_team_members (
  id uuid not null default gen_random_uuid(),
  full_name text not null,
  role_title text not null,
  member_type text not null default 'employee'::text,
  email text,
  phone text,
  start_date date,
  status text not null default 'active'::text,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
create table public.contact_messages (
  id uuid not null default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamp with time zone not null default now()
);
create table public.cost_centers (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.customer_credit_entries (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  customer_id uuid not null,
  entry_type text not null,
  amount numeric(14,2) not null,
  sale_id uuid,
  due_date date,
  method text,
  finance_account_id uuid,
  reference text,
  note text,
  recorded_by text,
  created_at timestamp with time zone not null default now()
);
create table public.customers (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  phone text,
  email text,
  loyalty_points integer default 0,
  created_at timestamp with time zone default now(),
  company text,
  status text default 'lead'::text,
  source text,
  pricelist_id uuid,
  credit_limit numeric not null default 0,
  credit_terms_days integer not null default 30,
  notes text
);
create table public.deals (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  customer_id uuid not null,
  title text not null,
  value numeric not null default 0,
  stage text not null default 'new'::text,
  expected_close_date date,
  created_at timestamp with time zone not null default now()
);
create table public.delivery_notes (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  delivery_number text not null,
  sale_id uuid,
  customer_name text,
  warehouse_id uuid,
  vehicle_id uuid,
  driver_employee_id uuid,
  status text not null default 'pending'::text,
  items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamp with time zone not null default now()
);
create table public.department_engine_defaults (
  id uuid not null default gen_random_uuid(),
  department_id uuid not null,
  engine_id uuid not null
);
create table public.departments (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  created_at timestamp with time zone not null default now(),
  head_user_id uuid
);
create table public.documents (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  category text not null default 'other'::text,
  file_path text not null,
  file_size integer,
  uploaded_by_name text,
  created_at timestamp with time zone not null default now(),
  status text not null default 'active'::text,
  archived_at timestamp with time zone,
  archive_expires_at timestamp with time zone,
  visibility text not null default 'org'::text,
  created_by uuid default auth.uid()
);
create table public.employees (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  full_name text not null,
  email text,
  phone text,
  role text,
  department text,
  employment_status text not null default 'active'::text,
  salary numeric not null default 0,
  hire_date date,
  created_at timestamp with time zone not null default now(),
  user_id uuid
);
create table public.engine_license_tiers (
  id uuid not null default gen_random_uuid(),
  engine_id uuid not null,
  seats integer not null,
  price numeric not null
);
create table public.engines (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  category text default 'core'::text,
  tier text default 'tier1'::text,
  status text default 'active'::text,
  version text default '1.0.0'::text,
  icon text default '⚙'::text,
  created_at timestamp with time zone default now(),
  monthly_price numeric not null default 1200
);
create table public.error_logs (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  source text not null,
  message text not null,
  code text,
  context jsonb,
  created_at timestamp with time zone not null default now(),
  severity text not null default 'error'::text
);
create table public.finance_accounts (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  name text not null,
  type text not null,
  category text,
  balance numeric default 0,
  currency text default 'KES'::text,
  created_at timestamp with time zone default now(),
  status text not null default 'active'::text,
  coa_id uuid
);
create table public.finance_cashflow (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  type text not null,
  amount numeric not null,
  description text,
  date date default CURRENT_DATE,
  created_at timestamp with time zone default now()
);
create table public.finance_expenses (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  title text not null,
  amount numeric not null,
  currency text default 'KES'::text,
  category text,
  vendor text,
  payment_method text default 'cash'::text,
  status text default 'paid'::text,
  date date default CURRENT_DATE,
  notes text,
  created_at timestamp with time zone default now()
);
create table public.finance_transactions (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  account_id uuid,
  type text not null,
  amount numeric not null,
  currency text default 'KES'::text,
  description text,
  category text,
  reference text,
  payment_method text default 'cash'::text,
  status text default 'completed'::text,
  date date default CURRENT_DATE,
  created_at timestamp with time zone default now(),
  coa_id uuid,
  cost_center_id uuid
);
create table public.founder_settings (
  user_id uuid not null,
  full_name text,
  location text,
  platform_name text not null default 'AUREVYN'::text,
  default_currency text not null default 'KES'::text,
  default_package text not null default 'Starter'::text,
  timezone text not null default 'Africa/Nairobi'::text,
  platform_theme text not null default 'rift-valley'::text,
  notify_new_org boolean not null default true,
  notify_payment_received boolean not null default true,
  notify_payment_overdue boolean not null default true,
  notify_module_activated boolean not null default false,
  notify_system_alerts boolean not null default true,
  notify_weekly_report boolean not null default true,
  updated_at timestamp with time zone not null default now(),
  theme_preset_id uuid
);
create table public.inventory_batches (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  product_id uuid not null,
  warehouse_id uuid,
  batch_number text,
  quantity numeric not null default 0,
  expiry_date date,
  received_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);
create table public.inventory_movements (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  product_id uuid not null,
  type text not null,
  quantity numeric(12,2) not null,
  note text,
  created_at timestamp with time zone default now()
);
create table public.inventory_products (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  sku text not null,
  category text,
  unit text default 'pcs'::text,
  stock_quantity numeric(12,2) default 0,
  low_stock_threshold numeric(12,2) default 10,
  unit_price numeric(12,2) default 0,
  status text default 'active'::text,
  created_at timestamp with time zone default now(),
  critical_stock_threshold numeric,
  avg_cost numeric not null default 0,
  reorder_quantity numeric,
  default_supplier_id uuid,
  barcode text
);
create table public.inventory_stock_levels (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  product_id uuid not null,
  warehouse_id uuid not null,
  quantity numeric not null default 0
);
create table public.inventory_transfers (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  product_id uuid not null,
  from_warehouse_id uuid not null,
  to_warehouse_id uuid not null,
  quantity numeric not null,
  note text,
  transferred_by_name text,
  created_at timestamp with time zone not null default now()
);
create table public.invoices (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  org_name text not null,
  amount text not null,
  status text default 'pending'::text,
  due_date date,
  paid_date date,
  description text,
  created_at timestamp with time zone default now(),
  invoice_no text not null default ('INV-'::text || lpad((nextval('invoice_no_seq'::regclass))::text, 4, '0'::text)),
  amount_kes numeric not null default 0,
  kind text not null default 'manual'::text,
  period_start date,
  claim_method text,
  claim_reference text,
  claimed_at timestamp with time zone
);
create table public.journal_entries (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  source_type text not null,
  source_id uuid,
  description text,
  date date not null,
  created_at timestamp with time zone not null default now()
);
create table public.journal_lines (
  id uuid not null default gen_random_uuid(),
  entry_id uuid not null,
  org_id uuid not null,
  coa_id uuid not null,
  debit numeric not null default 0,
  credit numeric not null default 0,
  created_at timestamp with time zone not null default now()
);
create table public.knowledge_articles (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  title text not null,
  category text not null default 'general'::text,
  content text not null,
  created_by_name text,
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);
create table public.leave_requests (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  employee_id uuid not null,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
create table public.mail_messages (
  id uuid not null default gen_random_uuid(),
  thread_id uuid not null,
  sender_id uuid,
  sender_name text,
  from_founder boolean not null default false,
  body text not null,
  created_at timestamp with time zone not null default now(),
  recipients jsonb,
  attachments jsonb not null default '[]'::jsonb
);
create table public.mail_participants (
  thread_id uuid not null,
  user_id uuid not null,
  last_read_at timestamp with time zone,
  role text not null default 'to'::text
);
create table public.mail_threads (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  kind text not null,
  subject text not null,
  category text not null default 'general'::text,
  status text not null default 'open'::text,
  created_by uuid,
  created_by_name text,
  last_message_at timestamp with time zone not null default now(),
  last_sender_id uuid,
  last_from_founder boolean not null default false,
  founder_read_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);
create table public.maintenance_items (
  id uuid not null default gen_random_uuid(),
  title text not null,
  notes text,
  category text not null default 'other'::text,
  frequency text not null default 'monthly'::text,
  next_due date not null,
  last_completed date,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
create table public.message_templates (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  kind text not null default 'credit_reminder'::text,
  name text not null,
  subject text not null default ''::text,
  body text not null,
  created_by uuid default auth.uid(),
  created_at timestamp with time zone not null default now()
);
create table public.modules (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text,
  category text default 'core'::text,
  status text default 'active'::text,
  orgs_using integer default 0,
  created_at timestamp with time zone default now()
);
create table public.notifications (
  id uuid not null default gen_random_uuid(),
  type text not null,
  title text not null,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default now()
);
create table public.onboarding_emails_sent (
  org_id uuid not null,
  step text not null,
  sent_at timestamp with time zone not null default now()
);
create table public.ops_documents (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  project_id uuid,
  name text not null,
  type text default 'document'::text,
  size text,
  url text,
  uploaded_by text default 'Founder'::text,
  created_at timestamp with time zone default now()
);
create table public.ops_projects (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  team_id uuid,
  name text not null,
  description text,
  status text default 'active'::text,
  priority text default 'medium'::text,
  progress integer default 0,
  start_date date,
  due_date date,
  created_at timestamp with time zone default now(),
  visibility text not null default 'org'::text,
  created_by uuid default auth.uid()
);
create table public.ops_tasks (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  project_id uuid,
  title text not null,
  description text,
  status text default 'todo'::text,
  priority text default 'medium'::text,
  assignee text,
  due_date date,
  created_at timestamp with time zone default now()
);
create table public.ops_teams (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  name text not null,
  description text,
  color text default '#c9a84c'::text,
  lead text,
  member_count integer default 0,
  created_at timestamp with time zone default now()
);
create table public.org_custom_themes (
  org_id uuid not null,
  bg_base text not null,
  bg_surface text not null,
  bg_elevated text not null,
  bg_card text not null,
  bg_hover text not null,
  border text not null,
  border_light text not null,
  gold text not null,
  gold_light text not null,
  gold_dim text not null,
  text_primary text not null,
  text_secondary text not null,
  text_muted text not null,
  green text not null,
  amber text not null,
  red text not null,
  updated_at timestamp with time zone not null default now()
);
create table public.org_invoice_items (
  id uuid not null default gen_random_uuid(),
  invoice_id uuid not null,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  created_at timestamp with time zone not null default now(),
  tax_rate numeric not null default 0,
  tax_amount numeric not null default 0
);
create table public.org_invoices (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  customer_id uuid,
  invoice_number text not null,
  status text not null default 'draft'::text,
  issue_date date not null default CURRENT_DATE,
  due_date date not null,
  subtotal numeric not null default 0,
  vat_rate numeric not null default 16,
  vat_amount numeric not null default 0,
  total numeric not null default 0,
  notes text,
  finance_transaction_id uuid,
  created_at timestamp with time zone not null default now(),
  wht_rate numeric not null default 0,
  wht_amount numeric not null default 0
);
create table public.org_offers (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  kind text not null,
  engine_id uuid,
  value numeric not null,
  note text,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  revoked_at timestamp with time zone
);
create table public.org_settings (
  org_id uuid not null,
  business_name text,
  business_address text,
  business_phone text,
  logo_path text,
  default_vat_rate numeric not null default 16,
  default_wht_rate numeric not null default 0,
  invoice_prefix text not null default 'INV-'::text,
  updated_at timestamp with time zone not null default now(),
  theme text not null default 'rift-valley'::text,
  theme_preset_id uuid
);
create table public.org_users (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null,
  role text not null default 'admin'::text,
  created_at timestamp with time zone not null default now(),
  full_name text,
  email text,
  allowed_engines jsonb,
  hr_permissions jsonb not null default '{}'::jsonb,
  phone text,
  username text
);
create table public.organization_engines (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  engine_id uuid,
  enabled boolean default true,
  activated_at timestamp with time zone default now(),
  subscription_tier text default 'Msingi'::text,
  engine_slug text,
  granted_via text not null default 'founder'::text,
  licensed_seats integer not null default 0
);
create table public.organization_mpesa_configs (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  consumer_key text,
  consumer_secret text,
  shortcode text,
  passkey text,
  environment text not null default 'sandbox'::text,
  callback_url text,
  active boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create table public.organization_packages (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  package_id uuid not null,
  branch_multiplier_applied boolean not null default false,
  effective_price numeric not null,
  status text not null default 'active'::text,
  purchased_at timestamp with time zone not null default now(),
  cancelled_at timestamp with time zone
);
create table public.organization_payment_configs (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  provider_id uuid not null,
  enabled boolean default true,
  is_default boolean default false,
  display_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create table public.organizations (
  id uuid not null default gen_random_uuid(),
  name text not null,
  location text,
  status text default 'operational'::text,
  revenue text default 'KES 0'::text,
  package text default 'Starter'::text,
  created_at timestamp with time zone default now(),
  blueprint_id uuid,
  business_type text,
  company_size text,
  branch_count text,
  tax_id text,
  website text,
  onboarding_completed boolean not null default false,
  brand_color text,
  trial_ends_at timestamp with time zone,
  trial_locked boolean not null default false,
  package_confirmed_at timestamp with time zone,
  trial_grace_notified boolean not null default false,
  created_by uuid default auth.uid(),
  industry text
);
create table public.packages (
  id uuid not null default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  orgs integer default 0,
  created_at timestamp with time zone default now(),
  slug text,
  engine_slugs jsonb not null default '[]'::jsonb,
  requires_any_of jsonb not null default '[]'::jsonb,
  is_bundle boolean not null default false
);
create table public.payment_providers (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  supports_stk_push boolean default false,
  supports_cards boolean default false,
  supports_bank boolean default false,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create table public.payments (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  source_type text not null,
  source_id uuid not null,
  method text not null,
  amount numeric not null,
  status text not null default 'completed'::text,
  mpesa_code text,
  mpesa_phone text,
  card_last4 text,
  card_type text,
  bank_name text,
  bank_reference text,
  cheque_number text,
  cheque_bank text,
  cheque_date date,
  recorded_by_name text,
  created_at timestamp with time zone not null default now(),
  finance_account_id uuid
);
create table public.payroll_items (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  payroll_run_id uuid not null,
  employee_id uuid not null,
  gross_pay numeric not null default 0,
  deductions numeric not null default 0,
  net_pay numeric not null default 0,
  advance_repayment numeric not null default 0,
  employer_contributions numeric not null default 0,
  nssf numeric not null default 0,
  shif numeric not null default 0,
  ahl numeric not null default 0,
  paye numeric not null default 0
);
create table public.payroll_runs (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft'::text,
  total_amount numeric not null default 0,
  processed_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);
create table public.petty_cash_entries (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  float_id uuid not null,
  entry_type text not null,
  amount numeric not null,
  category text,
  payee text,
  description text,
  receipt_ref text,
  source_account_id uuid,
  recorded_by text,
  created_at timestamp with time zone not null default now()
);
create table public.pos_branches (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  location text,
  status text default 'active'::text,
  created_at timestamp with time zone default now()
);
create table public.pos_customers (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  phone text,
  email text,
  loyalty_points integer default 0,
  created_at timestamp with time zone default now()
);
create table public.pos_discounts (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  type text not null,
  value numeric not null,
  active boolean default true,
  created_at timestamp with time zone default now()
);
create table public.pos_payments (
  id uuid not null default gen_random_uuid(),
  sale_id uuid not null,
  payment_method text,
  amount numeric(14,2) default 0,
  reference text,
  created_at timestamp with time zone default now()
);
create table public.pos_products (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  sku text not null,
  category text,
  barcode text,
  selling_price numeric(14,2) default 0,
  cost_price numeric(14,2) default 0,
  stock_quantity integer default 0,
  status text default 'active'::text,
  created_at timestamp with time zone default now()
);
create table public.pos_register_sessions (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  register_id uuid,
  opened_by uuid,
  closed_by uuid,
  opening_float numeric(12,2) default 0,
  expected_cash numeric(12,2) default 0,
  actual_cash numeric(12,2) default 0,
  variance numeric(12,2) default 0,
  status text default 'OPEN'::text,
  opened_at timestamp with time zone default now(),
  closed_at timestamp with time zone
);
create table public.pos_registers (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  branch_id uuid not null,
  name text not null,
  status text default 'open'::text,
  created_at timestamp with time zone default now()
);
create table public.pos_return_items (
  id uuid not null default gen_random_uuid(),
  return_id uuid,
  product_id uuid,
  product_name text,
  quantity numeric,
  unit_price numeric,
  total numeric
);
create table public.pos_returns (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  sale_id uuid,
  reason text,
  refund_method text,
  refund_amount numeric default 0,
  status text default 'completed'::text,
  created_at timestamp with time zone default now()
);
create table public.pos_sale_items (
  id uuid not null default gen_random_uuid(),
  sale_id uuid not null,
  product_name text not null,
  quantity numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  total numeric(12,2) not null,
  product_id uuid
);
create table public.pos_sales (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  payment_method text not null,
  status text default 'completed'::text,
  cashier text,
  created_at timestamp with time zone default now(),
  receipt_number text,
  warehouse_id uuid,
  discount_id uuid,
  discount_amount numeric default 0,
  customer_name text,
  customer_id uuid,
  tax_amount numeric not null default 0
);
create table public.pricelist_items (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  pricelist_id uuid not null,
  product_id uuid not null,
  price numeric not null
);
create table public.pricelists (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  description text,
  is_default boolean not null default false,
  currency text not null default 'KES'::text,
  created_at timestamp with time zone not null default now()
);
create table public.promotions (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  type text not null,
  value numeric default 0,
  minimum_purchase numeric default 0,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  active boolean default true,
  created_at timestamp with time zone default now()
);
create table public.purchase_order_items (
  id uuid not null default gen_random_uuid(),
  po_id uuid not null,
  product_id uuid not null,
  quantity numeric not null,
  unit_cost numeric not null,
  received_quantity numeric not null default 0,
  created_at timestamp with time zone not null default now(),
  tax_rate numeric not null default 0,
  tax_amount numeric not null default 0
);
create table public.purchase_orders (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  approval_request_id uuid,
  product_id uuid,
  po_number text not null,
  supplier_name text not null,
  quantity numeric,
  unit_cost numeric,
  total_cost numeric not null,
  status text not null default 'approved'::text,
  document_id uuid,
  created_at timestamp with time zone not null default now(),
  supplier_id uuid,
  origin text not null default 'approval'::text,
  due_date date,
  vat_amount numeric not null default 0
);
create table public.quick_notes (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  user_id uuid not null,
  content text not null,
  visibility text not null default 'private'::text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);
create table public.receipts (
  id uuid not null default gen_random_uuid(),
  receipt_no text not null default ('RCT-'::text || lpad((nextval('receipt_no_seq'::regclass))::text, 4, '0'::text)),
  invoice_id uuid not null,
  org_id uuid not null,
  amount_kes numeric not null,
  method text not null,
  reference text,
  paid_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);
create table public.resource_shares (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  resource_type text not null,
  resource_id uuid not null,
  user_id uuid not null,
  access text not null default 'view'::text,
  shared_by uuid,
  created_at timestamp with time zone not null default now()
);
create table public.roadmap_items (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text,
  area text not null default 'platform'::text,
  status text not null default 'backlog'::text,
  priority text not null default 'medium'::text,
  target_date date,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
create table public.salary_advances (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  employee_id uuid not null,
  amount numeric not null,
  outstanding_balance numeric not null default 0,
  reason text,
  status text not null default 'pending'::text,
  requested_by_user_id uuid,
  requested_at timestamp with time zone not null default now(),
  decided_by_name text,
  decided_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);
create table public.saved_carts (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  customer_id uuid,
  items jsonb not null,
  total numeric default 0,
  created_at timestamp with time zone default now()
);
create table public.scheduled_company_expenses (
  id uuid not null default gen_random_uuid(),
  category text not null default 'other'::text,
  vendor text,
  description text not null,
  amount numeric not null,
  currency text not null default 'KES'::text,
  frequency text not null,
  next_run date not null,
  last_run date,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.scheduled_invoices (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  customer_id uuid,
  label text not null,
  items jsonb not null,
  vat_rate numeric not null default 16,
  wht_rate numeric not null default 0,
  notes text,
  due_days_offset integer not null default 14,
  frequency text not null,
  next_run date not null,
  last_run date,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.scheduled_platform_invoices (
  id uuid not null default gen_random_uuid(),
  org_id uuid,
  org_name text not null,
  description text not null,
  amount numeric not null,
  frequency text not null,
  next_run date not null,
  last_run date,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.scheduled_purchase_orders (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  supplier_id uuid,
  supplier_name text not null,
  label text not null,
  items jsonb not null,
  frequency text not null,
  next_run date not null,
  last_run date,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.security_attacks (
  id uuid not null default gen_random_uuid(),
  attack_type text not null,
  severity text not null,
  source_ip text,
  target_path text,
  blocked boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);
create table public.security_events (
  id uuid not null default gen_random_uuid(),
  event_type text not null,
  severity text default 'LOW'::text,
  ip_address text,
  request_path text,
  request_method text,
  organization_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);
create table public.security_rules (
  id uuid not null default gen_random_uuid(),
  name text not null,
  pattern text,
  action text,
  active boolean default true
);
create table public.site_announcements (
  id uuid not null default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'info'::text,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);
create table public.stock_take_items (
  id uuid not null default gen_random_uuid(),
  stock_take_id uuid not null,
  product_id uuid not null,
  expected_quantity numeric not null default 0,
  counted_quantity numeric,
  variance numeric default (COALESCE(counted_quantity, (0)::numeric) - expected_quantity),
  counted_at timestamp with time zone
);
create table public.stock_takes (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  warehouse_id uuid not null,
  status text not null default 'in_progress'::text,
  started_by text,
  started_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone
);
create table public.storefront_waitlist (
  id uuid not null default gen_random_uuid(),
  email text not null,
  created_at timestamp with time zone not null default now()
);
create table public.suppliers (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  contact_name text,
  phone text,
  email text,
  payment_terms text,
  categories text[] not null default '{}'::text[],
  created_at timestamp with time zone not null default now()
);
create table public.support_messages (
  id uuid not null default gen_random_uuid(),
  ticket_id uuid not null,
  sender_type text not null,
  sender_name text not null,
  message text not null,
  created_at timestamp with time zone not null default now()
);
create table public.support_tickets (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  created_by_user_id uuid not null,
  created_by_name text not null,
  subject text not null,
  status text not null default 'open'::text,
  priority text not null default 'normal'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by_email text
);
create table public.team_invites (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  email text not null,
  role text not null default 'staff'::text,
  allowed_engines jsonb,
  token text not null default encode(gen_random_bytes(16), 'hex'::text),
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null default (now() + '7 days'::interval)
);
create table public.theme_presets (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text,
  bg_base text not null,
  bg_surface text not null,
  bg_elevated text not null,
  bg_card text not null,
  bg_hover text not null,
  border text not null,
  border_light text not null,
  gold text not null,
  gold_light text not null,
  gold_dim text not null,
  text_primary text not null,
  text_secondary text not null,
  text_muted text not null,
  green text not null,
  amber text not null,
  red text not null,
  created_at timestamp with time zone not null default now()
);
create table public.user_engine_licenses (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null,
  engine_id uuid not null,
  assigned_at timestamp with time zone not null default now()
);
create table public.vehicles (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  type text not null,
  plate_number text,
  capacity text,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now()
);
create table public.vulnerability_reports (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text,
  severity text not null,
  status text default 'OPEN'::text,
  source text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);
create table public.warehouses (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  code text,
  address text,
  is_default boolean not null default false,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now()
);

-- =====================================================================
-- VIEW
-- =====================================================================
create or replace view public.customer_balances as
 select customer_id, org_id,
        coalesce(sum(case when entry_type = 'sale' then amount else -amount end), 0::numeric) as balance
   from customer_credit_entries
  group by customer_id, org_id;

-- =====================================================================
-- FUNCTIONS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.adjust_stock_level(p_product_id uuid, p_warehouse_id uuid, p_org_id uuid, p_delta numeric)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
declare
  new_qty numeric;
begin
  insert into inventory_stock_levels (org_id, product_id, warehouse_id, quantity)
  values (p_org_id, p_product_id, p_warehouse_id, greatest(p_delta, 0))
  on conflict (product_id, warehouse_id)
  do update set quantity = greatest(inventory_stock_levels.quantity + p_delta, 0)
  returning quantity into new_qty;
  return new_qty;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_founder()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.founder_settings fs
    where fs.user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_mail_participant(p_thread uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from mail_participants where thread_id = p_thread and user_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from org_users where org_id = p_org and user_id = auth.uid() and role in ('owner','admin'));
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(check_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
      and ou.role in ('owner', 'admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_member(check_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.org_users ou
    where ou.org_id = check_org_id
      and ou.user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_edit_resource(p_type text, p_id uuid, p_org uuid, p_vis text, p_creator uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_founder()
    or (public.is_org_member(p_org) and (
         p_vis = 'org'
         or p_creator = auth.uid()
         or public.is_org_admin(p_org)
         or exists (select 1 from resource_shares s where s.resource_type = p_type and s.resource_id = p_id and s.user_id = auth.uid() and s.access = 'edit')
       ));
$function$;

CREATE OR REPLACE FUNCTION public.can_view_resource(p_type text, p_id uuid, p_org uuid, p_vis text, p_creator uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_founder()
    or (public.is_org_member(p_org) and (
         p_vis = 'org'
         or p_creator = auth.uid()
         or public.is_org_admin(p_org)
         or exists (select 1 from resource_shares s where s.resource_type = p_type and s.resource_id = p_id and s.user_id = auth.uid())
       ));
$function$;

CREATE OR REPLACE FUNCTION public.can_access_document_file(p_path text, p_write boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare org_txt text := split_part(p_path, '/', 1); d record;
begin
  if org_txt !~ '^[0-9a-fA-F-]{36}$' then return public.is_founder(); end if;
  select id, org_id, visibility, created_by into d from documents where file_path = p_path limit 1;
  if not found then return public.is_founder() or public.is_org_member(org_txt::uuid); end if;
  if p_write then return public.can_edit_resource('document', d.id, d.org_id, d.visibility, d.created_by); end if;
  return public.can_view_resource('document', d.id, d.org_id, d.visibility, d.created_by);
end $function$;

CREATE OR REPLACE FUNCTION public.approval_guard_decider()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r text;
begin
  if auth.uid() is null or public.is_founder() then return new; end if;
  if old.status = 'pending' and new.status <> 'pending' then
    select role into r from org_users where org_id = old.org_id and user_id = auth.uid() limit 1;
    if r is null or r not in ('owner','admin','manager') then
      if not (old.stage = 'department' and old.dept_head_user_id = auth.uid() and new.status = 'rejected') then
        raise exception 'Only an owner, admin or manager can approve or reject requests.';
      end if;
    end if;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.approval_guard_stage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if old.stage = 'department' and old.status = 'pending' and auth.uid() is not null
     and coalesce(current_setting('app.dept_reroute', true), '0') <> '1' then
    if (new.status <> 'pending' or new.stage <> 'department')
       and auth.uid() is distinct from old.dept_head_user_id
       and not public.is_founder() then
      raise exception 'This request is waiting for the department head to endorse it first.';
    end if;
  end if;
  if old.stage = 'final' and new.stage = 'department' then
    raise exception 'A request cannot go back to the department head.';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.approval_route_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  member_count int;
  dept_name text;
  dept record;
begin
  new.stage := 'final';
  if new.requested_by_user_id is null then return new; end if;
  select count(*) into member_count from org_users where org_id = new.org_id;
  if member_count <= 10 then return new; end if;
  select department into dept_name from employees
    where org_id = new.org_id and user_id = new.requested_by_user_id limit 1;
  if dept_name is null then return new; end if;
  select id, head_user_id into dept from departments
    where org_id = new.org_id and lower(name) = lower(dept_name) limit 1;
  if dept.id is null or dept.head_user_id is null or dept.head_user_id = new.requested_by_user_id then return new; end if;
  new.stage := 'department';
  new.department_id := dept.id;
  new.dept_head_user_id := dept.head_user_id;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.department_head_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.head_user_id is distinct from old.head_user_id then
    perform set_config('app.dept_reroute', '1', true);
    update approval_requests
       set dept_head_user_id = new.head_user_id,
           stage = case when new.head_user_id is null then 'final' else stage end
     where department_id = new.id and status = 'pending' and stage = 'department';
    perform set_config('app.dept_reroute', '0', true);
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.check_credit_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  lim numeric;
  bal numeric;
begin
  select credit_limit into lim from public.customers where id = new.customer_id for update;
  select coalesce(sum(case when entry_type = 'sale' then amount else -amount end), 0)
    into bal from public.customer_credit_entries where customer_id = new.customer_id;
  if new.entry_type = 'sale' then
    if coalesce(lim, 0) <= 0 then
      raise exception 'CREDIT_NOT_ENABLED: this customer has no credit limit';
    end if;
    if bal + new.amount > lim then
      raise exception 'CREDIT_LIMIT_EXCEEDED: balance % + % is over the limit of %', bal, new.amount, lim;
    end if;
  else
    if new.amount > bal then
      raise exception 'OVERPAYMENT: payment % is more than the balance of %', new.amount, bal;
    end if;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.check_stale_approvals()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  req record;
begin
  for req in
    select ar.*, o.name as org_name
    from approval_requests ar
    join organizations o on o.id = ar.org_id
    where ar.status = 'pending'
      and ar.created_at < now() - interval '3 days'
      and (ar.last_reminded_at is null or ar.last_reminded_at < now() - interval '1 day')
  loop
    insert into notifications (type, title, message, read)
    values (
      'stale_approval',
      'Approval pending 3+ days',
      req.org_name || ': "' || req.title || '" has been waiting since ' || to_char(req.created_at, 'Mon DD'),
      false
    );

    insert into activity (icon, title, sub, org_id)
    values ('⏰', 'Reminder: approval overdue', req.title, req.org_id);

    update approval_requests set last_reminded_at = now() where id = req.id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.check_trial_status()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  org record;
begin
  -- Grace period reminder: trial just ended, within the 2-day grace window,
  -- no package confirmed yet, haven't already notified.
  for org in
    select * from organizations
    where trial_ends_at is not null
      and trial_ends_at <= now()
      and trial_ends_at + interval '2 days' > now()
      and package_confirmed_at is null
      and trial_grace_notified = false
  loop
    insert into notifications (type, title, message, read)
    values (
      'trial_ending',
      'Trial ending soon',
      org.name || ': free trial ended, 2 days left to pick a plan before access is paused',
      false
    );

    insert into activity (org_id, icon, title, sub, created_at)
    values (org.id, '⏳', 'Trial ended - grace period started', 'Pick a plan within 2 days to keep full access', now());

    update organizations set trial_grace_notified = true where id = org.id;
  end loop;

  -- Lock: past the grace period, still no package confirmed.
  for org in
    select * from organizations
    where trial_ends_at is not null
      and trial_ends_at + interval '2 days' <= now()
      and package_confirmed_at is null
      and trial_locked = false
  loop
    update organization_engines set enabled = false where org_id = org.id;
    update organizations set trial_locked = true where id = org.id;

    insert into activity (org_id, icon, title, sub, created_at)
    values (org.id, '🔒', 'Access paused', 'Pick a plan to continue using AUREVYN', now());
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_engine_seat_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  seat_limit integer;
  current_count integer;
begin
  select licensed_seats into seat_limit from organization_engines
    where org_id = new.org_id and engine_id = new.engine_id;
  if seat_limit is null then
    raise exception 'This engine is not enabled for this organization.';
  end if;
  select count(*) into current_count from user_engine_licenses
    where org_id = new.org_id and engine_id = new.engine_id;
  if current_count >= seat_limit then
    raise exception 'No available seats for this engine — purchase more licenses first.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_subscription_invoices()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o record; r record; d record;
  total numeric; tier_price numeric; created integer := 0;
  last_start date; next_start date; lines text; period_label text;
begin
  -- Housekeeping: anything past its due date becomes overdue
  update invoices set status = 'overdue'
   where status = 'pending' and due_date is not null and due_date < current_date;

  for o in select id, name, package_confirmed_at from organizations where package_confirmed_at is not null loop
    select max(period_start) into last_start from invoices where org_id = o.id and kind = 'subscription';
    next_start := (coalesce(last_start, o.package_confirmed_at::date) + interval '1 month')::date;
    if next_start > current_date then continue; end if;

    total := 0; lines := '';
    for r in
      select oe.engine_id, e.name,
             greatest(coalesce(oe.licensed_seats, 0) - coalesce((
               select sum(f.value) from org_offers f
                where f.org_id = o.id and f.engine_id = oe.engine_id and f.kind = 'free_seats' and f.status = 'active'
             ), 0), 0)::int as paid_seats
        from organization_engines oe join engines e on e.id = oe.engine_id
       where oe.org_id = o.id and oe.enabled
    loop
      continue when r.paid_seats <= 0;
      select price into tier_price from engine_license_tiers
       where engine_id = r.engine_id and seats >= r.paid_seats order by seats limit 1;
      continue when tier_price is null;

      for d in select kind, value from org_offers
                where org_id = o.id and status = 'active'
                  and kind in ('discount_percent','discount_fixed')
                  and (engine_id is null or engine_id = r.engine_id)
      loop
        if d.kind = 'discount_percent' then tier_price := tier_price * (1 - least(d.value, 100) / 100);
        else tier_price := tier_price - d.value; end if;
      end loop;

      tier_price := greatest(round(tier_price), 0);
      total := total + tier_price;
      lines := lines || case when lines = '' then '' else ', ' end || r.name || ' (' || r.paid_seats || ' seats)';
    end loop;

    if total <= 0 then continue; end if;

    period_label := to_char(next_start, 'Mon YYYY');
    insert into invoices (org_id, org_name, amount, amount_kes, status, due_date, description, kind, period_start)
    values (o.id, o.name, 'KES ' || to_char(total, 'FM999,999,999'), total, 'pending',
            next_start + 7, 'Subscription ' || period_label || ': ' || lines, 'subscription', next_start);
    created := created + 1;
  end loop;

  return created;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_scheduled_company_expenses()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sched record;
  v_next_run date;
begin
  for sched in
    select * from scheduled_company_expenses
    where active = true and next_run <= current_date
  loop
    insert into company_expenses (date, category, vendor, description, amount, currency)
    values (current_date, sched.category, sched.vendor, sched.description, sched.amount, sched.currency);

    v_next_run := case sched.frequency
      when 'weekly' then sched.next_run + interval '7 days'
      when 'monthly' then sched.next_run + interval '1 month'
      when 'quarterly' then sched.next_run + interval '3 months'
      when 'annual' then sched.next_run + interval '1 year'
    end;

    update scheduled_company_expenses
      set last_run = current_date, next_run = v_next_run
      where id = sched.id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_scheduled_invoices()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sched record;
  v_subtotal numeric;
  v_vat_amount numeric;
  v_wht_amount numeric;
  v_total numeric;
  v_invoice_number text;
  v_prefix text;
  v_count integer;
  v_invoice_id uuid;
  v_due_date date;
  v_next_run date;
begin
  for sched in
    select * from scheduled_invoices
    where active = true and next_run <= current_date
  loop
    select coalesce(sum((i->>'quantity')::numeric * (i->>'unit_price')::numeric), 0)
      into v_subtotal
      from jsonb_array_elements(sched.items) as i;

    v_vat_amount := v_subtotal * (sched.vat_rate / 100);
    v_wht_amount := v_subtotal * (sched.wht_rate / 100);
    v_total := v_subtotal + v_vat_amount;

    select count(*) into v_count from org_invoices where org_id = sched.org_id;
    select invoice_prefix into v_prefix from org_settings where org_id = sched.org_id;
    v_prefix := coalesce(v_prefix, 'INV-');
    v_invoice_number := v_prefix || lpad((v_count + 1)::text, 4, '0');

    v_due_date := current_date + sched.due_days_offset;

    insert into org_invoices (
      org_id, customer_id, invoice_number, status, issue_date, due_date,
      subtotal, vat_rate, vat_amount, wht_rate, wht_amount, total, notes
    ) values (
      sched.org_id, sched.customer_id, v_invoice_number, 'draft', current_date, v_due_date,
      v_subtotal, sched.vat_rate, v_vat_amount, sched.wht_rate, v_wht_amount, v_total, sched.notes
    )
    returning id into v_invoice_id;

    insert into org_invoice_items (invoice_id, description, quantity, unit_price, total)
    select
      v_invoice_id,
      i->>'description',
      (i->>'quantity')::numeric,
      (i->>'unit_price')::numeric,
      (i->>'quantity')::numeric * (i->>'unit_price')::numeric
    from jsonb_array_elements(sched.items) as i;

    insert into activity (org_id, icon, title, sub, created_at)
    values (sched.org_id, '🔁', 'Recurring invoice generated', v_invoice_number || ' — ' || sched.label, now());

    v_next_run := case sched.frequency
      when 'weekly' then sched.next_run + interval '7 days'
      when 'monthly' then sched.next_run + interval '1 month'
      when 'quarterly' then sched.next_run + interval '3 months'
      when 'annual' then sched.next_run + interval '1 year'
    end;

    update scheduled_invoices
      set last_run = current_date, next_run = v_next_run
      where id = sched.id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_scheduled_platform_invoices()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sched record;
  v_next_run date;
begin
  for sched in
    select * from scheduled_platform_invoices
    where active = true and next_run <= current_date and org_id is not null
  loop
    insert into invoices (org_id, org_name, amount, amount_kes, status, due_date, description)
    values (
      sched.org_id,
      sched.org_name,
      'KES ' || to_char(sched.amount, 'FM999,999,999'),
      sched.amount,
      'pending',
      current_date + interval '14 days',
      sched.description
    );

    v_next_run := case sched.frequency
      when 'weekly' then sched.next_run + interval '7 days'
      when 'monthly' then sched.next_run + interval '1 month'
      when 'quarterly' then sched.next_run + interval '3 months'
      when 'annual' then sched.next_run + interval '1 year'
    end;

    update scheduled_platform_invoices
      set last_run = current_date, next_run = v_next_run
      where id = sched.id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_scheduled_purchase_orders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sched record;
  v_total_cost numeric;
  v_po_number text;
  v_count integer;
  v_po_id uuid;
  v_next_run date;
begin
  for sched in
    select * from scheduled_purchase_orders
    where active = true and next_run <= current_date
  loop
    select coalesce(sum((i->>'quantity')::numeric * (i->>'unitCost')::numeric), 0)
      into v_total_cost
      from jsonb_array_elements(sched.items) as i;

    select count(*) into v_count from purchase_orders where org_id = sched.org_id;
    v_po_number := 'PO-' || lpad((v_count + 1)::text, 4, '0');

    insert into purchase_orders (
      org_id, approval_request_id, product_id, po_number, supplier_id, supplier_name,
      quantity, unit_cost, total_cost, status, origin
    ) values (
      sched.org_id, null, null, v_po_number, sched.supplier_id, sched.supplier_name,
      null, null, v_total_cost, 'approved', 'manual'
    )
    returning id into v_po_id;

    insert into purchase_order_items (po_id, product_id, quantity, unit_cost)
    select
      v_po_id,
      (i->>'productId')::uuid,
      (i->>'quantity')::numeric,
      (i->>'unitCost')::numeric
    from jsonb_array_elements(sched.items) as i;

    insert into activity (org_id, icon, title, sub, created_at)
    values (sched.org_id, '🔁', 'Recurring purchase order generated', v_po_number || ' — ' || sched.label, now());

    v_next_run := case sched.frequency
      when 'weekly' then sched.next_run + interval '7 days'
      when 'monthly' then sched.next_run + interval '1 month'
      when 'quarterly' then sched.next_run + interval '3 months'
      when 'annual' then sched.next_run + interval '1 year'
    end;

    update scheduled_purchase_orders
      set last_run = current_date, next_run = v_next_run
      where id = sched.id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sum_stock_quantity(p_product_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(sum(quantity), 0) from inventory_stock_levels where product_id = p_product_id;
$function$;

CREATE OR REPLACE FUNCTION public.sync_org_engines_from_packages(p_org_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_slugs jsonb;
begin
  select coalesce(jsonb_agg(distinct slug), '[]'::jsonb)
  into v_slugs
  from (
    select jsonb_array_elements_text(p.engine_slugs) as slug
    from organization_packages op
    join packages p on p.id = op.package_id
    where op.org_id = p_org_id and op.status = 'active'
  ) s;

  insert into organization_engines (org_id, engine_id, enabled, granted_via)
  select p_org_id, e.id, true, 'package'
  from engines e
  where e.slug in (select jsonb_array_elements_text(v_slugs))
  on conflict (org_id, engine_id) do update
    set enabled = true, granted_via = 'package'
    where organization_engines.granted_via in ('package', 'trial');

  update organization_engines oe
  set enabled = false
  from engines e
  where oe.engine_id = e.id
    and oe.org_id = p_org_id
    and oe.granted_via = 'package'
    and not (e.slug in (select jsonb_array_elements_text(v_slugs)));
end;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_sync_org_engines()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  perform sync_org_engines_from_packages(coalesce(new.org_id, old.org_id));
  return coalesce(new, old);
end;
$function$;

-- The two functions below call Supabase Edge Functions over HTTP.
-- <PROJECT_REF> and <ANON_KEY> are placeholders (real values removed).
CREATE OR REPLACE FUNCTION public.trigger_on_invoice_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/on-overdue-invoice',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_on_new_org()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/on-new-org',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$function$;

-- =====================================================================
-- TRIGGERS
-- =====================================================================
CREATE TRIGGER on_new_org_trigger AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION trigger_on_new_org();
CREATE TRIGGER on_invoice_update_trigger AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION trigger_on_invoice_update();
CREATE TRIGGER organization_packages_sync AFTER INSERT OR DELETE OR UPDATE ON public.organization_packages FOR EACH ROW EXECUTE FUNCTION trigger_sync_org_engines();
CREATE TRIGGER trg_enforce_engine_seat_limit BEFORE INSERT ON public.user_engine_licenses FOR EACH ROW EXECUTE FUNCTION enforce_engine_seat_limit();
CREATE TRIGGER customer_credit_entries_check BEFORE INSERT ON public.customer_credit_entries FOR EACH ROW EXECUTE FUNCTION check_credit_entry();
CREATE TRIGGER approval_route_on_insert BEFORE INSERT ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION approval_route_on_insert();
CREATE TRIGGER approval_guard_stage BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION approval_guard_stage();
CREATE TRIGGER department_head_changed AFTER UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION department_head_changed();
CREATE TRIGGER approval_guard_decider BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION approval_guard_decider();

-- =====================================================================
-- ROW-LEVEL SECURITY
-- Every table in public has row-level security enabled (117 of 117).
-- =====================================================================
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Policies (tables a to l) ---------------------------------------------
create policy "Founder full access" on public.account_reconciliations for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own reconciliations" on public.account_reconciliations for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.activities for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own activities" on public.activities for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.activity for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own activity" on public.activity for all to public using (((org_id IS NOT NULL) AND is_org_member(org_id))) with check (((org_id IS NOT NULL) AND is_org_member(org_id)));
create policy "Founder full access" on public.approval_requests for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own approval requests" on public.approval_requests for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.audit_trail for all to public using (is_founder()) with check (is_founder());
create policy "Org members add to own audit trail" on public.audit_trail for insert to public with check (is_org_member(org_id));
create policy "Org members read own audit trail" on public.audit_trail for select to public using (is_org_member(org_id));
create policy "Authenticated can read blueprint engines" on public.blueprint_engines for select to public using ((auth.role() = 'authenticated'::text));
create policy "Founder manages blueprint engines" on public.blueprint_engines for all to public using (is_founder()) with check (is_founder());
create policy "Authenticated can read blueprints" on public.blueprints for select to public using ((auth.role() = 'authenticated'::text));
create policy "Founder manages blueprints" on public.blueprints for all to public using (is_founder()) with check (is_founder());
create policy "Founder full access" on public.broadcasts for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own broadcasts" on public.broadcasts for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.chart_of_accounts for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own chart of accounts" on public.chart_of_accounts for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.commerce_coupons for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own coupons" on public.commerce_coupons for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.commerce_promotions for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own commerce promotions" on public.commerce_promotions for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.commerce_rules for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own commerce rules" on public.commerce_rules for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy founder_only on public.company_documents for all to authenticated using (((auth.jwt() ->> 'email'::text) = 'aurevynstudio@gmail.com'::text)) with check (((auth.jwt() ->> 'email'::text) = 'aurevynstudio@gmail.com'::text));
create policy "Founder full access" on public.company_expenses for all to public using (is_founder()) with check (is_founder());
create policy "Founder full access" on public.company_profile for all to public using (is_founder()) with check (is_founder());
create policy founder_only on public.company_team_members for all to authenticated using (((auth.jwt() ->> 'email'::text) = 'aurevynstudio@gmail.com'::text)) with check (((auth.jwt() ->> 'email'::text) = 'aurevynstudio@gmail.com'::text));
create policy "Allow public insert on contact_messages" on public.contact_messages for insert to public with check (true);
create policy "Founder can read contact messages" on public.contact_messages for select to public using (is_founder());
create policy "Founder full access" on public.cost_centers for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own cost centers" on public.cost_centers for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.customer_credit_entries for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own credit entries" on public.customer_credit_entries for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.customers for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own customers" on public.customers for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.deals for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own deals" on public.deals for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access delivery_notes" on public.delivery_notes for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own delivery_notes" on public.delivery_notes for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.department_engine_defaults for all to public using (is_founder()) with check (is_founder());
create policy "Org admins manage dept defaults" on public.department_engine_defaults for all to public using ((EXISTS ( SELECT 1 FROM departments d WHERE ((d.id = department_engine_defaults.department_id) AND is_org_admin_or_owner(d.org_id))))) with check ((EXISTS ( SELECT 1 FROM departments d WHERE ((d.id = department_engine_defaults.department_id) AND is_org_admin_or_owner(d.org_id)))));
create policy "Org members read dept defaults" on public.department_engine_defaults for select to public using ((EXISTS ( SELECT 1 FROM departments d WHERE ((d.id = department_engine_defaults.department_id) AND is_org_member(d.org_id)))));
create policy "Founder full access" on public.departments for all to public using (is_founder()) with check (is_founder());
create policy "Org admins manage departments" on public.departments for all to public using (is_org_admin_or_owner(org_id)) with check (is_org_admin_or_owner(org_id));
create policy "Org members read departments" on public.departments for select to public using (is_org_member(org_id));
create policy "Founder full access" on public.documents for all to public using (is_founder()) with check (is_founder());
create policy "Org members can upload documents" on public.documents for insert to public with check (is_org_member(org_id));
create policy documents_read on public.documents for select to authenticated using (can_view_resource('document'::text, id, org_id, visibility, created_by));
create policy documents_update on public.documents for update to authenticated using (can_edit_resource('document'::text, id, org_id, visibility, created_by)) with check (is_org_member(org_id));
create policy "Founder full access" on public.employees for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own employees" on public.employees for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Anyone authenticated can read tiers" on public.engine_license_tiers for select to public using ((auth.role() = 'authenticated'::text));
create policy "Founder manages tiers" on public.engine_license_tiers for all to public using (is_founder()) with check (is_founder());
create policy "Public can read tiers" on public.engine_license_tiers for select to anon using (true);
create policy "Authenticated can read engines" on public.engines for select to public using ((auth.role() = 'authenticated'::text));
create policy "Founder manages engines" on public.engines for all to public using (is_founder()) with check (is_founder());
create policy "Public can read engines" on public.engines for select to anon using (true);
create policy "Founder full access" on public.error_logs for all to public using (is_founder()) with check (is_founder());
create policy "Members log errors for their own org" on public.error_logs for insert to authenticated with check (((org_id IS NULL) OR is_org_member(org_id) OR is_founder()));
create policy "Org members delete own error logs" on public.error_logs for delete to public using (((org_id IS NOT NULL) AND is_org_member(org_id)));
create policy "Org members read own error logs" on public.error_logs for select to public using (((org_id IS NOT NULL) AND is_org_member(org_id)));
create policy "Founder full access" on public.finance_accounts for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own finance accounts" on public.finance_accounts for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.finance_cashflow for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own cashflow" on public.finance_cashflow for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.finance_expenses for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own finance expenses" on public.finance_expenses for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.finance_transactions for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own finance transactions" on public.finance_transactions for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.founder_settings for all to public using (is_founder()) with check (is_founder());
create policy "Founder full access" on public.inventory_batches for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own batches" on public.inventory_batches for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.inventory_movements for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own inventory movements" on public.inventory_movements for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.inventory_products for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own inventory products" on public.inventory_products for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.inventory_stock_levels for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own stock levels" on public.inventory_stock_levels for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.inventory_transfers for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own inventory transfers" on public.inventory_transfers for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.invoices for all to public using (is_founder()) with check (is_founder());
create policy invoices_org_admin_read on public.invoices for select to authenticated using ((EXISTS ( SELECT 1 FROM org_users ou WHERE ((ou.org_id = invoices.org_id) AND (ou.user_id = auth.uid()) AND (ou.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));
create policy "Founder full access journal_entries" on public.journal_entries for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own journal_entries" on public.journal_entries for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access journal_lines" on public.journal_lines for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own journal_lines" on public.journal_lines for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.knowledge_articles for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own knowledge articles" on public.knowledge_articles for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.leave_requests for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own leave requests" on public.leave_requests for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Policies (tables m to z) ---------------------------------------------
create policy mail_messages_read on public.mail_messages for select to authenticated using ((is_founder() OR (EXISTS ( SELECT 1 FROM mail_participants p WHERE ((p.thread_id = mail_messages.thread_id) AND (p.user_id = auth.uid()))))));
create policy mail_participants_read on public.mail_participants for select to authenticated using (((user_id = auth.uid()) OR is_founder() OR is_mail_participant(thread_id)));
create policy mail_threads_read on public.mail_threads for select to authenticated using ((is_founder() OR (EXISTS ( SELECT 1 FROM mail_participants p WHERE ((p.thread_id = mail_threads.id) AND (p.user_id = auth.uid()))))));
create policy "Founder full access" on public.maintenance_items for all to public using (is_founder()) with check (is_founder());
create policy "Founder full access" on public.message_templates for all to public using (is_founder()) with check (is_founder());
create policy "Org admins manage templates" on public.message_templates for all to public using (is_org_admin_or_owner(org_id)) with check (is_org_admin_or_owner(org_id));
create policy "Org members read templates" on public.message_templates for select to public using (is_org_member(org_id));
create policy "Authenticated can read modules" on public.modules for select to public using ((auth.role() = 'authenticated'::text));
create policy "Founder manages modules" on public.modules for all to public using (is_founder()) with check (is_founder());
create policy "Founder full access" on public.notifications for all to public using (is_founder()) with check (is_founder());
create policy "Founder full access" on public.onboarding_emails_sent for all to public using (is_founder()) with check (is_founder());
create policy "Founder full access" on public.ops_documents for all to public using (is_founder()) with check (is_founder());
create policy ops_documents_delete on public.ops_documents for delete to authenticated using ((is_org_member(org_id) AND ((project_id IS NULL) OR (EXISTS ( SELECT 1 FROM ops_projects p WHERE ((p.id = ops_documents.project_id) AND can_edit_resource('project'::text, p.id, p.org_id, p.visibility, p.created_by)))))));
create policy ops_documents_insert on public.ops_documents for insert to authenticated with check ((is_org_member(org_id) AND ((project_id IS NULL) OR (EXISTS ( SELECT 1 FROM ops_projects p WHERE ((p.id = ops_documents.project_id) AND can_edit_resource('project'::text, p.id, p.org_id, p.visibility, p.created_by)))))));
create policy ops_documents_read on public.ops_documents for select to authenticated using ((is_org_member(org_id) AND ((project_id IS NULL) OR (EXISTS ( SELECT 1 FROM ops_projects p WHERE (p.id = ops_documents.project_id))))));
create policy ops_documents_update on public.ops_documents for update to authenticated using ((is_org_member(org_id) AND ((project_id IS NULL) OR (EXISTS ( SELECT 1 FROM ops_projects p WHERE ((p.id = ops_documents.project_id) AND can_edit_resource('project'::text, p.id, p.org_id, p.visibility, p.created_by))))))) with check ((is_org_member(org_id) AND ((project_id IS NULL) OR (EXISTS ( SELECT 1 FROM ops_projects p WHERE ((p.id = ops_documents.project_id) AND can_edit_resource('project'::text, p.id, p.org_id, p.visibility, p.created_by)))))));
create policy "Founder full access" on public.ops_projects for all to public using (is_founder()) with check (is_founder());
create policy ops_projects_delete on public.ops_projects for delete to authenticated using ((is_org_admin(org_id) OR (created_by = auth.uid())));
create policy ops_projects_insert on public.ops_projects for insert to authenticated with check (is_org_member(org_id));
create policy ops_projects_read on public.ops_projects for select to authenticated using (can_view_resource('project'::text, id, org_id, visibility, created_by));
create policy ops_projects_update on public.ops_projects for update to authenticated using (can_edit_resource('project'::text, id, org_id, visibility, created_by)) with check (is_org_member(org_id));
create policy "Founder full access" on public.ops_tasks for all to public using (is_founder()) with check (is_founder());
create policy ops_tasks_delete on public.ops_tasks for delete to authenticated using ((is_org_member(org_id) AND ((project_id IS NULL) OR (EXISTS ( SELECT 1 FROM ops_projects p WHERE ((p.id = ops_tasks.project_id) AND can_edit_resource('project'::text, p.id, p.org_id, p.visibility, p.created_by)))))));
create policy ops_tasks_insert on public.ops_tasks for insert to authenticated with check ((is_org_member(org_id) AND ((project_id IS NULL) OR (EXISTS ( SELECT 1 FROM ops_projects p WHERE ((p.id = ops_tasks.project_id) AND can_edit_resource('project'::text, p.id, p.org_id, p.visibility, p.created_by)))))));
create policy ops_tasks_read on public.ops_tasks for select to authenticated using ((is_org_member(org_id) AND ((project_id IS NULL) OR (EXISTS ( SELECT 1 FROM ops_projects p WHERE (p.id = ops_tasks.project_id))))));
create policy ops_tasks_update on public.ops_tasks for update to authenticated using ((is_org_member(org_id) AND ((project_id IS NULL) OR (EXISTS ( SELECT 1 FROM ops_projects p WHERE ((p.id = ops_tasks.project_id) AND can_edit_resource('project'::text, p.id, p.org_id, p.visibility, p.created_by))))))) with check ((is_org_member(org_id) AND ((project_id IS NULL) OR (EXISTS ( SELECT 1 FROM ops_projects p WHERE ((p.id = ops_tasks.project_id) AND can_edit_resource('project'::text, p.id, p.org_id, p.visibility, p.created_by)))))));
create policy "Founder full access" on public.ops_teams for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own teams" on public.ops_teams for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Org members can manage their custom theme" on public.org_custom_themes for all to public using ((org_id IN ( SELECT org_users.org_id FROM org_users WHERE (org_users.user_id = auth.uid())))) with check ((org_id IN ( SELECT org_users.org_id FROM org_users WHERE (org_users.user_id = auth.uid()))));
create policy "Founder full access" on public.org_invoice_items for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own invoice items" on public.org_invoice_items for all to public using ((EXISTS ( SELECT 1 FROM org_invoices oi WHERE ((oi.id = org_invoice_items.invoice_id) AND is_org_member(oi.org_id))))) with check ((EXISTS ( SELECT 1 FROM org_invoices oi WHERE ((oi.id = org_invoice_items.invoice_id) AND is_org_member(oi.org_id)))));
create policy "Founder full access" on public.org_invoices for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own invoices" on public.org_invoices for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy org_offers_founder_all on public.org_offers for all to authenticated using (is_founder()) with check (is_founder());
create policy org_offers_member_read on public.org_offers for select to authenticated using (is_org_member(org_id));
create policy "Founder full access" on public.org_settings for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own settings" on public.org_settings for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Accept invite creates own membership" on public.org_users for insert to public with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM team_invites ti WHERE ((ti.org_id = org_users.org_id) AND (ti.status = 'pending'::text) AND (ti.expires_at > now()) AND (lower(ti.email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))))))));
create policy "First owner bootstrap on new org" on public.org_users for insert to public with check (((user_id = auth.uid()) AND (role = 'owner'::text) AND (NOT (EXISTS ( SELECT 1 FROM org_users existing WHERE (existing.org_id = org_users.org_id))))));
create policy "Founder full access" on public.org_users for all to public using (is_founder()) with check (is_founder());
create policy "Org members can view their org roster" on public.org_users for select to public using (is_org_member(org_id));
create policy "Owners and admins manage org roster" on public.org_users for all to public using (is_org_admin_or_owner(org_id)) with check (is_org_admin_or_owner(org_id));
create policy "Founder full access" on public.organization_engines for all to public using (is_founder()) with check (is_founder());
create policy "Org members can read own engines" on public.organization_engines for select to public using (is_org_member(org_id));
create policy "Founder manages all organization_packages" on public.organization_packages for all to public using (is_founder()) with check (is_founder());
create policy "Org members can read their org's packages" on public.organization_packages for select to public using (is_org_member(org_id));
create policy "Founder full access" on public.organization_payment_configs for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own payment config" on public.organization_payment_configs for all to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy "Authenticated can create an organization" on public.organizations for insert to public with check ((auth.role() = 'authenticated'::text));
create policy "Creator can read the org they just created" on public.organizations for select to public using ((created_by = auth.uid()));
create policy "Founder full access" on public.organizations for all to public using (is_founder()) with check (is_founder());
create policy "Org members can read own org" on public.organizations for select to public using (is_org_member(id));
create policy "Authenticated can read packages" on public.packages for select to public using ((auth.role() = 'authenticated'::text));
create policy "Founder manages packages" on public.packages for all to public using (is_founder()) with check (is_founder());
create policy "Authenticated can read payment providers" on public.payment_providers for select to public using ((auth.role() = 'authenticated'::text));
create policy "Founder manages payment providers" on public.payment_providers for all to public using (is_founder()) with check (is_founder());
create policy "Founder full access" on public.payments for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own payments" on public.payments for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.payroll_items for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own payroll items" on public.payroll_items for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.payroll_runs for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own payroll runs" on public.payroll_runs for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.petty_cash_entries for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own petty cash" on public.petty_cash_entries for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.pos_branches for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pos branches" on public.pos_branches for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.pos_customers for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pos customers" on public.pos_customers for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.pos_discounts for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own discounts" on public.pos_discounts for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.pos_payments for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pos payments" on public.pos_payments for all to public using ((EXISTS ( SELECT 1 FROM pos_sales s WHERE ((s.id = pos_payments.sale_id) AND is_org_member(s.org_id))))) with check ((EXISTS ( SELECT 1 FROM pos_sales s WHERE ((s.id = pos_payments.sale_id) AND is_org_member(s.org_id)))));
create policy "Founder full access" on public.pos_products for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pos products" on public.pos_products for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.pos_register_sessions for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own register sessions" on public.pos_register_sessions for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.pos_registers for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pos registers" on public.pos_registers for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.pos_return_items for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pos return items" on public.pos_return_items for all to public using ((EXISTS ( SELECT 1 FROM pos_returns r WHERE ((r.id = pos_return_items.return_id) AND is_org_member(r.org_id))))) with check ((EXISTS ( SELECT 1 FROM pos_returns r WHERE ((r.id = pos_return_items.return_id) AND is_org_member(r.org_id)))));
create policy "Founder full access" on public.pos_returns for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pos returns" on public.pos_returns for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.pos_sale_items for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pos sale items" on public.pos_sale_items for all to public using ((EXISTS ( SELECT 1 FROM pos_sales s WHERE ((s.id = pos_sale_items.sale_id) AND is_org_member(s.org_id))))) with check ((EXISTS ( SELECT 1 FROM pos_sales s WHERE ((s.id = pos_sale_items.sale_id) AND is_org_member(s.org_id)))));
create policy "Founder full access" on public.pos_sales for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pos sales" on public.pos_sales for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.pricelist_items for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pricelist items" on public.pricelist_items for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.pricelists for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own pricelists" on public.pricelists for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.promotions for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own promotions" on public.promotions for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.purchase_order_items for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own PO items" on public.purchase_order_items for all to public using ((EXISTS ( SELECT 1 FROM purchase_orders po WHERE ((po.id = purchase_order_items.po_id) AND is_org_member(po.org_id))))) with check ((EXISTS ( SELECT 1 FROM purchase_orders po WHERE ((po.id = purchase_order_items.po_id) AND is_org_member(po.org_id)))));
create policy "Founder full access" on public.purchase_orders for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own purchase orders" on public.purchase_orders for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Creator can delete own notes" on public.quick_notes for delete to public using ((user_id = auth.uid()));
create policy "Creator or org member can complete shared notes" on public.quick_notes for update to public using (((user_id = auth.uid()) OR ((org_id IS NOT NULL) AND is_org_member(org_id) AND (visibility = 'shared'::text)))) with check (((user_id = auth.uid()) OR ((org_id IS NOT NULL) AND is_org_member(org_id) AND (visibility = 'shared'::text))));
create policy "Founder full access" on public.quick_notes for all to public using (is_founder()) with check (is_founder());
create policy "Org members create own notes" on public.quick_notes for insert to public with check (((user_id = auth.uid()) AND (((org_id IS NOT NULL) AND is_org_member(org_id)) OR ((org_id IS NULL) AND is_founder()))));
create policy "Org members view own or shared notes" on public.quick_notes for select to public using ((((org_id IS NOT NULL) AND is_org_member(org_id) AND ((visibility = 'shared'::text) OR (user_id = auth.uid()))) OR ((org_id IS NULL) AND is_founder() AND (user_id = auth.uid()))));
create policy receipts_founder_all on public.receipts for all to authenticated using (is_founder()) with check (is_founder());
create policy receipts_org_admin_read on public.receipts for select to authenticated using ((EXISTS ( SELECT 1 FROM org_users ou WHERE ((ou.org_id = receipts.org_id) AND (ou.user_id = auth.uid()) AND (ou.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));
create policy resource_shares_read on public.resource_shares for select to authenticated using (((user_id = auth.uid()) OR is_org_admin(org_id) OR is_founder()));
create policy "Founder full access" on public.roadmap_items for all to public using (is_founder()) with check (is_founder());
create policy "Founder full access to salary advances" on public.salary_advances for all to public using (is_founder()) with check (is_founder());
create policy "Org members can manage salary advances" on public.salary_advances for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Org members can read salary advances" on public.salary_advances for select to public using (is_org_member(org_id));
create policy "Founder full access" on public.saved_carts for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own saved carts" on public.saved_carts for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.scheduled_company_expenses for all to public using (is_founder()) with check (is_founder());
create policy "Org members can manage their scheduled invoices" on public.scheduled_invoices for all to public using ((org_id IN ( SELECT org_users.org_id FROM org_users WHERE (org_users.user_id = auth.uid())))) with check ((org_id IN ( SELECT org_users.org_id FROM org_users WHERE (org_users.user_id = auth.uid()))));
create policy "Founder full access" on public.scheduled_platform_invoices for all to public using (is_founder()) with check (is_founder());
create policy "Org members can manage their scheduled purchase orders" on public.scheduled_purchase_orders for all to public using ((org_id IN ( SELECT org_users.org_id FROM org_users WHERE (org_users.user_id = auth.uid())))) with check ((org_id IN ( SELECT org_users.org_id FROM org_users WHERE (org_users.user_id = auth.uid()))));
create policy "Founder manages announcements" on public.site_announcements for all to public using (is_founder()) with check (is_founder());
create policy "Public can read active announcements" on public.site_announcements for select to public using ((active = true));
create policy "Founder full access" on public.stock_take_items for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own stock take items" on public.stock_take_items for all to public using ((EXISTS ( SELECT 1 FROM stock_takes st WHERE ((st.id = stock_take_items.stock_take_id) AND is_org_member(st.org_id))))) with check ((EXISTS ( SELECT 1 FROM stock_takes st WHERE ((st.id = stock_take_items.stock_take_id) AND is_org_member(st.org_id)))));
create policy "Founder full access" on public.stock_takes for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own stock takes" on public.stock_takes for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Anyone can join waitlist" on public.storefront_waitlist for insert to public with check (true);
create policy "Founder can read waitlist" on public.storefront_waitlist for select to public using (is_founder());
create policy "Founder full access" on public.suppliers for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own suppliers" on public.suppliers for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.support_messages for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own ticket messages" on public.support_messages for all to public using ((EXISTS ( SELECT 1 FROM support_tickets t WHERE ((t.id = support_messages.ticket_id) AND is_org_member(t.org_id))))) with check ((EXISTS ( SELECT 1 FROM support_tickets t WHERE ((t.id = support_messages.ticket_id) AND is_org_member(t.org_id)))));
create policy "Founder full access" on public.support_tickets for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own tickets" on public.support_tickets for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.team_invites for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own team invites" on public.team_invites for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Authenticated can read theme presets" on public.theme_presets for select to public using ((auth.role() = 'authenticated'::text));
create policy "Founder manages theme presets" on public.theme_presets for all to public using (is_founder()) with check (is_founder());
create policy "Founder full access" on public.user_engine_licenses for all to public using (is_founder()) with check (is_founder());
create policy "Org admins manage licenses" on public.user_engine_licenses for all to public using (is_org_admin_or_owner(org_id)) with check (is_org_admin_or_owner(org_id));
create policy "Org members read own org licenses" on public.user_engine_licenses for select to public using (is_org_member(org_id));
create policy "Founder full access vehicles" on public.vehicles for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own vehicles" on public.vehicles for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "Founder full access" on public.warehouses for all to public using (is_founder()) with check (is_founder());
create policy "Org members manage own warehouses" on public.warehouses for all to public using (is_org_member(org_id)) with check (is_org_member(org_id));

-- =====================================================================
-- STORAGE (buckets + policies)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('org-logos', 'org-logos', true) on conflict do nothing;

create policy documents_bucket_delete on storage.objects for delete to authenticated using (((bucket_id = 'documents'::text) AND can_access_document_file(name, true)));
create policy documents_bucket_insert on storage.objects for insert to authenticated with check (((bucket_id = 'documents'::text) AND (split_part(name, '/'::text, 1) ~ '^[0-9a-fA-F-]{36}$'::text) AND is_org_member((split_part(name, '/'::text, 1))::uuid)));
create policy documents_bucket_read on storage.objects for select to authenticated using (((bucket_id = 'documents'::text) AND can_access_document_file(name)));
create policy org_logos_delete on storage.objects for delete to authenticated using (((bucket_id = 'org-logos'::text) AND (split_part(name, '/'::text, 1) ~ '^[0-9a-fA-F-]{36}$'::text) AND is_org_admin((split_part(name, '/'::text, 1))::uuid)));
create policy org_logos_insert on storage.objects for insert to authenticated with check (((bucket_id = 'org-logos'::text) AND (split_part(name, '/'::text, 1) ~ '^[0-9a-fA-F-]{36}$'::text) AND is_org_admin((split_part(name, '/'::text, 1))::uuid)));
create policy org_logos_public_read on storage.objects for select to public using ((bucket_id = 'org-logos'::text));
create policy org_logos_update on storage.objects for update to authenticated using (((bucket_id = 'org-logos'::text) AND (split_part(name, '/'::text, 1) ~ '^[0-9a-fA-F-]{36}$'::text) AND is_org_admin((split_part(name, '/'::text, 1))::uuid)));

-- =====================================================================
-- SCHEDULED JOBS (pg_cron)
-- =====================================================================
select cron.schedule('check-stale-approvals-daily',           '0 8 * * *',  'select check_stale_approvals();');
select cron.schedule('process-scheduled-invoices-daily',      '0 2 * * *',  'select process_scheduled_invoices()');
select cron.schedule('process-scheduled-purchase-orders-daily','5 2 * * *', 'select process_scheduled_purchase_orders()');
select cron.schedule('process-scheduled-company-expenses-daily','10 2 * * *','select process_scheduled_company_expenses()');
select cron.schedule('process-scheduled-platform-invoices-daily','15 2 * * *','select process_scheduled_platform_invoices()');
select cron.schedule('check-trial-status-daily',              '0 6 * * *',  'select check_trial_status();');
select cron.schedule('aurevyn-subscription-billing',          '0 3 * * *',  'select public.generate_subscription_invoices()');
select cron.schedule('purge-expired-documents-daily', '30 2 * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/purge-expired-documents',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);
