# Launch checklist: development to production (DRAFT, nothing here has been run)

Production (`jtxarxlzptqcwqliiilo`) is empty: no organizations, and none of the reference data (engines, prices, blueprints, packages, themes). Do these in order, in the PROD project, on launch day.

## 1. Database
1. `1-schema-changes.sql` in the SQL Editor (creates `message_templates`, `onboarding_emails_sent`, `org_users.username`, the new `packages` columns, safer founder policies, required `org_id`).
2. The three function updates named at the bottom of that file (copy the blocks from `../schema.sql`).
3. `2-seed-data.sql`. The last line should show 10, 60, 7, 21, 8.
4. Run the test-data wipe only on dev. Never on prod.

## 2. Storage
- Create buckets `documents` (private) and `org-logos` (public) in the dashboard.
- Apply the 7 storage policies from the bottom of `../schema.sql` (names start `documents_bucket_` and `org_logos_`).

## 3. Scheduled jobs (pg_cron)
- Store the service role key in the Vault as `service_role_key` (dashboard > Vault), because the daily jobs read it.
- Run the `cron.schedule(...)` lines from `../schema.sql`.

## 4. Vercel environment (production)
Supabase URL and keys for PROD, `CRON_SECRET` (no spaces), `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `FOUNDER_ALERT_EMAIL`, Paystack LIVE keys, site URL. Then redeploy.

## 5. Accounts
Create your founder account in PROD, then add your row to `founder_settings`.

## 6. Smoke test
Register a throwaway organization, buy one engine seat, create a staff user, make one sale, download an invoice PDF, confirm the welcome email arrives. Delete the throwaway organization afterwards.

Not included on purpose: the `modules` table (old demo rows, nothing reads them for customers).
