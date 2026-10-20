# AUREVYN

A multi-tenant business platform for Kenyan SMEs: point of sale, inventory, finance, procurement, HR and payroll, CRM, approvals and more, sold as "engines" that each organization switches on with a number of seats.

Built with Next.js (App Router) and Supabase. There is also a Windows desktop shell (Electron) in `desktop/`.

> **Read `AGENTS.md` first.** This project uses a Next.js version with breaking changes. Check `node_modules/next/dist/docs/` before writing framework code, and note that route protection lives in `src/proxy.ts` (Next's middleware replacement).

## Run it

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run dev                  # http://localhost:3000
npm run lint                 # 0 errors; the remaining warnings are known debt
npx tsc --noEmit             # type check
```

The app will not start without the three Supabase variables. Use your own Supabase project, not the live one. The database schema is described under "Database" below. Everything else in `.env.example` is optional and the feature simply switches off without it.

## How it is organized

| Path | What lives there |
|---|---|
| `src/app/` | Pages and API routes. Public marketing pages at the top level; the business app under `org/[orgId]/...`; the founder console under `dashboard/`. |
| `src/app/org/[orgId]/` | One folder per screen of the business app (pos, inventory, finance, procurement, approvals, documents, mail, users...). |
| `src/lib/` | Data access and business logic, one file per area (`approvals.ts`, `purchaseOrders.ts`, `customerCredit.ts`...). Most talk to Supabase directly from the browser, protected by row-level security. |
| `src/lib/server/` | Server-only helpers (email, Paystack, mail, attachments). |
| `src/lib/engines/`, `src/lib/runtime/` | Engine registry and the per-organization runtime (licensing, membership, engine access). |
| `src/components/marketing/`, `src/styles/marketing.css` | The public website and its design tokens. The app itself has separate themes in `src/app/globals.css`. |
| `src/proxy.ts` | Sign-in gate, founder two-factor, org membership check, forced password change. |
| `desktop/` | Electron shell that loads the hosted site. Releases are built by `.github/workflows/desktop-release.yml` from tags named `desktop-vX.Y.Z`. |
| `vercel.json` | Daily cron for the onboarding emails (`/api/cron/onboarding-emails`). |

## Ideas worth knowing before reading the code

- **Tenancy and security are in the database.** Every business table has an `org_id`, and row-level security policies (`is_org_member`, `is_org_admin_or_owner`, `is_founder`) decide who sees what. The client is trusted with nothing. API routes re-check access with `requireOrgAccess`, `requireOrgAdmin` or `requireFounder` (`src/lib/server/guards.ts`) instead of trusting an org id from the request.
- **Roles:** owner, admin, manager, staff (`src/lib/permissions.ts`). Owner holds billing; admin runs the system; manager approves and sees financial reports; staff use the engines they are licensed for.
- **Licensing:** an organization licenses engines with a seat count; each user takes a seat per engine (`user_engine_licenses`). New organizations get a 30-day trial with everything on.
- **Approvals** are enforced by Postgres triggers, not just the UI: who may decide, department-head step first for organizations over ten people, and one approval per action (`withAuthorization` in `src/lib/auditTrail.ts`). Decisions and sensitive actions are written to `audit_trail`.
- **Staff sign in with a username** (an internal address ending `@staff.aurevyn.invalid`, see `src/lib/staffLogin.ts`) or an email. Admins create accounts and reset passwords; people choose their own password at first sign-in.
- **Billing** is monthly invoices from AUREVYN to each organization, paid by M-Pesa, bank, cash, cheque, or online through Paystack. A scheduled job (`aurevyn-subscription-billing`) generates invoices.
- **Offline:** the app is online-first. Only the POS sale queue (`src/lib/posOfflineQueue.ts`) works if the till page is already open when the connection drops.
- **Scheduled work** runs inside Supabase (pg_cron, plus a few edge functions) and in Vercel cron. These are not defined in this repo's code, so see the schema export.

## Database

The schema export belongs in `supabase/schema.sql`: tables, row-level security policies, functions, triggers and cron jobs, as a snapshot of the development project (not an ordered migration history). If that file is missing, ask the maintainer for it before reviewing security, because that is where most of the access rules live.

## Known gaps

- No automated tests.
- Department-head routing with 11+ people, mail attachments and the Documents hub have only been tried with small data.
- Emails only reach the founder until a sending domain is verified with Resend. Once verified, set `EMAIL_FROM_ADDRESS` (e.g. `AUREVYN <hello@yourdomain.com>`) in Vercel and redeploy; every email uses that one setting.
- M-Pesa at the till is recorded by hand (transaction code and phone); there is no live Safaricom Daraja connection. The `organization_mpesa_configs` table is unused.
- Documents shows the latest 200 POS receipts.
- About 190 lint warnings (`any` types, effects that set state) are tracked as debt, not errors.

## Deploying

The site runs on Vercel (set the variables from `.env.example` there, including `CRON_SECRET`). Supabase holds the data. For the desktop app, push a tag like `desktop-v1.0.3` and the workflow builds and publishes the Windows installer.
