# Product Canvas — POS/Inventory/Finance Platform (working name: Aurevyn)

## Positioning
Not an ERP. A POS that runs the whole business — sell, track stock, see cash —
with CRM, payroll, and security included, not upsold. Every new org gets all
engines free for 30 days; pays only for what they keep after.

Primary engines (the "money makers"): **POS, Inventory, Finance.**
Secondary engines (included, not the pitch): CRM, HR/Payroll, Security/AI Insights.

## Confirmed market gaps (from live competitor research — treat as directional,
## not a substitute for talking to real shopkeepers)

1. **KRA eTIMS compliance — legally mandatory since Sept 2024, not visibly
   solved by the popular/easy tools.**
   - Penalties up to KES 1,000,000 or imprisonment for non-compliance.
   - Loyverse, Mauzo, Pesapal show no visible eTIMS/VSCU integration.
   - Only dense, enterprise-flavored tools (BetaSuite, EliteTeQ, digabloPos)
     market eTIMS support — nothing "easy" also does it.
   - Real business cost: a B2B customer who needs an eTIMS invoice to book
     the expense will simply take their next order to a shop that can issue
     one. This is a revenue gap, not just a compliance checkbox.

2. **Trust and support, not features, is the #1 complaint across every major
   competitor.**
   - Pesapal: "funds held without explanation," unresolved fraud disputes,
     ignored account-closure requests.
   - Loyverse: live chat gated behind paid tiers; free-tier support is slow.

3. **USD-denominated add-on pricing creates real friction for KES businesses.**
   - Loyverse's advanced inventory/employee add-ons are priced in USD;
     reviewers explicitly flag this as expensive and confusing outside the US.

4. **B2B-facing retail (hardware stores, wholesalers, distributors) is
   underserved.** Loyverse and Mauzo both explicitly target consumer-facing,
   walk-in retail (cafes, salons, kiosks). Nobody popular is building for the
   shop that invoices other businesses — which is exactly where the eTIMS gap
   bites hardest.

## The ownable position
Nobody currently sits in the middle of "as easy as Mauzo" and "as compliant/
trustworthy as an enterprise ERP." That middle ground — simple, eTIMS-
compliant by default, KES-native pricing, support that actually responds —
is open.

## Naming status
"Aurevyn" is likely off the table (same-industry trademark risk from
"Aurevion" companies + a literal "Aurevyn" business already using the name,
plus real domain-cost friction). No replacement name has been confirmed yet
— session tested 30+ candidates across Swahili words, African symbols,
invented coinages, English compounds, and founder-name branding. Revisit
naming once positioning/features are locked; don't let it block building.

---

## Build-ready prompt (paste this into a fresh session or hand to a developer)

> Build toward a POS/Inventory/Finance platform for African SMEs, positioned
> as "not an ERP — a POS that runs the whole business," not a generic
> business-operating-system. POS, Inventory, and Finance are the primary
> product; CRM, HR/Payroll, and Security are secondary, included but not the
> pitch. All engines are free for a 30-day trial; customers choose what they
> keep afterward.
>
> Priority differentiators to build toward, in order:
> 1. **KRA eTIMS compliance built in by default** — every invoice generated
>    through POS should be eTIMS-compliant (VSCU/OSCU integration path),
>    with zero extra setup burden on the shop owner. This is the primary
>    wedge against existing competitors, none of whom combine ease-of-use
>    with tax compliance.
> 2. **Support that actually responds** — live support available on all
>    tiers, not gated behind paid plans; explicit SLA on response time.
>    Competitor reviews are dominated by "funds held without explanation"
>    and unanswered support tickets — reliability here is a real
>    differentiator, not a cost center.
> 3. **KES-native pricing throughout**, including any future add-ons — no
>    USD-denominated fees that create forex friction for local businesses.
> 4. **B2B invoicing depth** — proper tax-compliant invoices, supplier
>    ledgers, and paper trails suited to businesses that sell to other
>    businesses (hardware, wholesale, distribution), not just walk-in
>    consumer retail.
>
> Constraints: match existing design system (dark ink background, cobalt
> blueprint blue + saturated gold accents, IBM Plex Sans/Mono, "Sheet 0X"
> section labeling). Don't reintroduce the six-engine-equal-weight framing —
> POS/Inventory/Finance lead visually and in copy everywhere.
