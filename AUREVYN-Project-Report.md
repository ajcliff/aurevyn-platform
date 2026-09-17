# AUREVYN — Project Status Report
*Compiled September 16, 2026*

---

## 1. What AUREVYN Is (current positioning)

A multi-tenant Business Operating System for Kenyan SMEs, built solo. Two surfaces on one Next.js codebase: the **Founder Dashboard** (platform-wide admin) and the **Org Space** (what customers actually use — POS, Inventory, Finance, CRM, HR-Payroll, and more, as installable "Engines").

**Repositioning (Sept 16):** moving from "generic business OS" framing toward **"not an ERP — a POS that runs the whole business."** POS, Inventory, and Finance are the primary product ("moneymakers"); CRM, HR-Payroll, and Security/AI Insights are included but not the pitch.

**Naming status:** "AUREVYN" is likely not the final name — a trademark-risk check found a same-industry "Aurevion" conflict plus an unrelated existing business already using "Aurevyn," and domain costs are a factor. 30+ replacement candidates were tested with no confirmed winner. **Decision: keep building under AUREVYN as a working name; don't let naming block progress.**

**Target launch:** originally ~Sept 25, 2026; timeline has flexed as real product depth (Finance, Fleet, Inventory) got prioritized over the original date.

---

## 2. Stack & Architecture

- **Frontend:** Next.js 16 (Turbopack), TypeScript, React, CSS Modules + inline styles (no component library)
- **Backend:** Supabase — Postgres, Auth, Realtime, Edge Functions, `pg_cron`
- **Two Supabase projects:** `liqxfdfouuxvokbpvwpk` (dev/testing, permanent) and `jtxarxlzptqcwqliiilo` ("aurevyn-production", created for launch). Prod does **not** need to be kept in lockstep with dev proactively — only migrated when a feature actually needs to go live there.
- **Deployment plan:** Vercel, automatic deploys on push to `main`. Domain purchase deliberately deferred to last.
- **Backups:** GitHub Actions → daily `supabase db dump` → separate `aurevyn-backups` repo, 90-day auto-prune. **Not yet verified to point at the production project** — likely still backing up the old dev database. Needs a manual check of that repo's GitHub secrets.

---

## 3. Security

A full RLS (Row-Level Security) audit was completed early in this process and is one of the most consequential pieces of work done:

- **3 tables had RLS completely disabled** (`organizations`, `payment_providers`, `organization_payment_configs`) — anyone with the public API key could read/write them. Fixed.
- **The `org_users` membership table had zero real access control** — anyone could have inserted themselves into any organization at any role. Fixed with tight, purpose-built bootstrap policies (first-owner-on-new-org, accept-invite-by-matching-email) so legitimate signup/invite flows still work.
- **~20 tables** (HR, payroll, customers, deals, documents, invites, warehouses, inventory, etc.) had literal "allow anyone, no login required" policies. Fixed.
- **~13 tables** had policies *named* as if they were secured ("org members can access...") but were actually wide open underneath. Fixed.
- Founder-only platform tables were gated on "any logged-in user" rather than specifically the founder — any customer's staff account could have read/edited platform admin data. Fixed with a proper `is_founder()` helper.
- Both Supabase projects now have identical security posture: 88 tables, 156 matching RLS policies, verified via direct diff.

---

## 4. Engines — Current Depth

### POS — solid, most complete engine
Discounts, promotions, split payments, receipts, returns (handles corrections instead of allowing edits to completed sales — correct by design), barcode scanning (physical scanner input **and** phone camera), and an **offline sale queue** — sales taken with no connectivity save locally and sync automatically when signal returns, with a safety check for the rare case where two offline devices sell the last unit of the same item before either syncs.

### Inventory — deepened significantly this cycle
Core product CRUD, warehouses/branches, low-stock alerts. Recently added: **reorder points** (a saved reorder quantity + default supplier per product, which now pre-fills the existing auto-restock-approval workflow instead of leaving the approver to guess), **batch/expiry tracking** (with a 30-day expiring-soon alert), and a full **stock-take/cycle-count workflow** (start a count, enter what's physically on the shelf, variances get posted as audited stock adjustments).

A real audit pass on POS+Inventory together also caught and fixed several live bugs: double stock deduction at non-default warehouses, a race condition in concurrent stock updates, returns restocking to the wrong branch, refunds that weren't showing up anywhere in the books, and per-warehouse overselling (a branch with zero stock could still sell items that existed at a different branch).

### Finance — went from thin to genuinely capable
Started with a serious gap: transactions, expenses, and accounts could be created and read, but **never edited or deleted** — a real usability problem. Since fixed, along with a much larger buildout: a proper double-entry ledger, a Balance Sheet (previously only P&L existed), Accounts Payable/Creditors with aging, VAT reporting (output vs. input VAT, net payable/refundable), and COGS now correctly reduces inventory value on every sale via weighted-average product cost.

### Fleet & Delivery — built, bundled free with Inventory/POS
Vehicles, dispatch status, delivery notes. Explicitly decided not to add GPS tracking. Deliberately kept as a free sub-feature rather than its own priced engine.

---

## 5. Pricing Model

The pricing approach evolved substantially through discussion:

1. **Started with fixed packages** (Core/Growth/Professional/Enterprise) — rejected as unfair, since a customer using only POS would still pay for HR and CRM bundled into the same tier.
2. **Moved to a-la-carte, per-engine pricing** — a checklist of all 16 engines, each individually priced, customer pays only the sum of what they check. This is the current direction.
3. **Considered going even more granular** (pricing individual sub-features within an engine, e.g., separately pricing VAT reporting vs. basic Finance) — **rejected** after building real depth into Finance/Inventory made clear how interdependent those sub-features actually are (VAT depends on invoices+POS; the Balance Sheet depends on the whole ledger). Splitting them would create confusing dependency chains for customers and support headaches, not real fairness.
4. **Fleet & Stock-Takes** were explicitly decided to stay bundled free with Inventory/POS rather than becoming their own priced line items.

**Trial mechanics (built):** every new signup gets all 16 engines free for 30 days automatically, followed by a 2-day grace period, followed by a mandatory plan-confirmation screen (checklist + running total) that generates a real recurring invoice using the existing manual-payment-recording system — deliberately avoiding the need for a live payment gateway just to test this flow end-to-end.

**A live in-app pricing editor** now exists on the founder dashboard's Packages page — engine and package prices are click-to-edit directly, no more going into Supabase to change a number.

**⚠️ Not yet applied:** the a-la-carte engine-selection code itself (the checklist UI, invoice generation, and the pricing editor) is built and verified but sits in a patch file (`aurevyn-alacarte-fixes.patch`) that hasn't been applied to the live repo yet.

---

## 6. Mobile Strategy

Decided against a hard "desktop only" rule (many Kenyan SME owners run their business primarily from a phone) and against building a separate native mobile app (not viable on the timeline). Instead:

- **View-only enforcement everywhere, at the data layer** — writes are blocked below 900px viewport width by wrapping the Supabase client itself, not just hiding buttons. This means the lock can't be bypassed by a determined user, and it required touching only one file to cover the entire app.
- **POS is the one deliberate exception** — real transactions work on mobile, including the offline queue described above, since that's the one workflow SME owners actually need away from a desk.
- **A cross-engine Quick Notes widget** — a floating button available everywhere (dashboard and every org page), for jotting down a task from a phone regardless of which engines are enabled, with a private/shared toggle per note and a completed-items history log.

---

## 7. Support Infrastructure

- **Welcome emails and critical error alerts** are built (via Resend), but need `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, and `FOUNDER_ALERT_EMAIL` set once a dedicated AUREVYN email and Resend account exist.
- **WhatsApp alerting** was requested but deferred — it requires Meta Business API developer setup (verification, approved message templates) that hasn't been done yet.
- A founder-side **Messages page** was built to actually read contact-form submissions, which were previously being saved but never displayed anywhere.
- **This is the next workstream**, per the positioning canvas's own priority list (support responsiveness is rated the #2 differentiator, behind only tax compliance).

---

## 8. Tax Compliance — eTIMS (KRA)

A significant finding from the positioning/competitor research: **KRA eTIMS compliance has been legally mandatory since September 2024**, with penalties up to KES 1,000,000 or imprisonment, and none of the "easy" competitor tools (Loyverse, Mauzo, Pesapal) visibly support it — only dense enterprise tools do. This is rated the #1 differentiator opportunity in the positioning canvas, and every invoice AUREVYN currently generates is technically non-compliant.

**Path forward, researched and confirmed:**
- Self-certifying as a KRA Third-Party Vendor integrator requires a registered company, at least 3 qualified technical staff, formal documentation, and a KRA review process. **AUREVYN is not yet a registered company, so this path is currently blocked.**
- The realistic path: integrate with an **already-certified third-party integrator** (e.g., Total Solutions Limited) rather than pursuing certification directly — the same pattern already used for payments (Pesapal/IntaSend instead of building M-Pesa Daraja directly). Typical cost: KES 50,000–300,000+.
- **Status: on hold** until ready to commit the cost. Next step when resumed: reach out to a certified integrator for API access and pricing before any integration code gets written.

---

## 9. Open Items / Not Yet Done

- Contact form delivery — confirmed working (writes to `contact_messages`, now readable via the Messages page)
- New-org welcome email — built, pending Resend account setup
- External error alerting — built (email), WhatsApp deferred
- Mobile responsiveness pass on older founder-dashboard pages — not yet done
- `requireOrgAccess.ts` — exists but is wired into zero actual API routes; a real (if currently low-risk) security gap for any future API route work
- Two dead-code trigger functions (`trigger_on_new_org`, `trigger_on_invoice_update`) exist in the dev database with hardcoded secrets in their SQL body — not currently harmful since nothing calls them, but should be cleaned up or properly wired before relying on them
- Production database is missing the full cumulative migration set from the Finance/Fleet/VAT/Inventory-depth work (by design — not needed until prod actually launches with these features)
- Marketing website and a standalone onboarding wizard are being developed in a separate, parallel workspace — not yet reconciled with this codebase; a possible duplicate "Messages" page (`dashboard/contact-messages` vs. the `dashboard/messages` built here) needs checking once that work merges in

---

## 10. Patches Built, Ready, But Not Yet Applied

Three patch files currently exist that haven't been applied to the live repo yet:

| Patch | Contains |
|---|---|
| `aurevyn-alacarte-fixes.patch` | A-la-carte engine checklist, invoice generation, pricing editor, SACCO removal |
| `aurevyn-inventory-depth.patch` | *(Confirmed already applied — visible working in the live app)* |
| `aurevyn-stock-takes-gating-fix.patch` | Two-line fix for the Stock Takes "not part of your plan" bug |

Recommended order: apply the stock-takes gating fix first (trivial, unblocks a page you're actively trying to use), then the a-la-carte patch when ready to go live with the new pricing model.

---

## 11. Notable Process Learnings (for continuity)

- **This repo has more than one active session working on it at times** — Finance, Fleet, and the double-entry ledger were partly built by a concurrent session without this one initiating it. Always re-clone and check `git log`/`tsc --noEmit` fresh before assuming local state is current, not just once at the start of a conversation.
- Claude has no GitHub push access in this environment — all fixes are delivered as downloadable patch files, applied and committed by the founder.
- Claude has standing, granted read/write access to both Supabase projects and applies needed migrations directly without asking each time.
