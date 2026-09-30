"use client";

import type { Organization } from "@/lib/organizations";
import type { Package } from "@/lib/packages";
import type { Invoice } from "@/lib/invoices";
import type { RoadmapItem } from "@/lib/roadmap";
import type { MaintenanceItem } from "@/lib/maintenance";
import type { CompanyDocument } from "@/lib/companyDocuments";
import type { CompanyMember } from "@/lib/companyTeam";
import type { CompanyProfile } from "@/lib/companyProfile";
import { useRouter } from "next/navigation";
import { docState, docTypeLabel } from "./Documents";
import { COLUMNS } from "./Roadmap";
import { daysUntil, kes, relativeDue, shortDate, toNumber } from "./utils";
import f from "@/styles/founder.module.css";
import c from "@/styles/company.module.css";

export type CompanyTab = "overview" | "roadmap" | "compliance" | "team" | "documents" | "profile";

type Props = {
  profile: CompanyProfile | null;
  orgs: Organization[];
  packages: Package[];
  invoices: Invoice[];
  roadmap: RoadmapItem[];
  maintenance: MaintenanceItem[];
  documents: CompanyDocument[];
  members: CompanyMember[];
  goTo: (tab: CompanyTab) => void;
};

type Attention = { id: string; title: string; detail: string; tone: "bad" | "warn"; tab?: CompanyTab; href?: string; action: string };
type Upcoming = { id: string; date: string; title: string; kind: string };

export default function Overview({ profile, orgs, packages, invoices, roadmap, maintenance, documents, members, goTo }: Props) {
  const router = useRouter();

  const running = orgs.filter(o => o.status === "operational").length;
  const flaggedOrgs = orgs.length - running;
  const mrr = packages.reduce((sum, p) => sum + toNumber(p.price) * p.orgs, 0);
  const openRoadmap = roadmap.filter(r => r.status !== "done");
  const inProgress = roadmap.filter(r => r.status === "in_progress");
  const openMaintenance = maintenance.filter(m => !(m.frequency === "one_off" && m.last_completed));
  const overdueMaintenance = openMaintenance.filter(m => daysUntil(m.next_due) < 0);
  const dueSoon = openMaintenance.filter(m => { const d = daysUntil(m.next_due); return d >= 0 && d <= 7; });
  const overdueInvoices = invoices.filter(i => i.status === "overdue");
  const overdueTotal = overdueInvoices.reduce((s, i) => s + toNumber(i.amount), 0);
  const activePeople = members.filter(m => m.status === "active").length;

  const attention: Attention[] = [
    ...overdueMaintenance.map(m => ({ id: `m-${m.id}`, title: m.title, detail: `Compliance, ${relativeDue(daysUntil(m.next_due)).toLowerCase()}`, tone: "bad" as const, tab: "compliance" as const, action: "Open" })),
    ...documents.filter(d => docState(d) === "expired").map(d => ({ id: `d-${d.id}`, title: d.title, detail: `${docTypeLabel[d.doc_type]} expired ${shortDate(d.expires_on)}`, tone: "bad" as const, tab: "documents" as const, action: "Open" })),
    ...(overdueInvoices.length > 0 ? [{ id: "inv", title: `${overdueInvoices.length} ${overdueInvoices.length === 1 ? "invoice" : "invoices"} overdue`, detail: `${kes(overdueTotal)} owed by customers`, tone: "bad" as const, href: "/dashboard/billing", action: "Billing" }] : []),
    ...(flaggedOrgs > 0 ? [{ id: "orgs", title: `${flaggedOrgs} ${flaggedOrgs === 1 ? "organization" : "organizations"} flagged`, detail: "Marked warning or critical", tone: "warn" as const, href: "/dashboard/organizations", action: "Review" }] : []),
    ...dueSoon.map(m => ({ id: `s-${m.id}`, title: m.title, detail: `Compliance, ${relativeDue(daysUntil(m.next_due)).toLowerCase()}`, tone: "warn" as const, tab: "compliance" as const, action: "Open" })),
    ...documents.filter(d => docState(d) === "expiring").map(d => ({ id: `e-${d.id}`, title: d.title, detail: `${docTypeLabel[d.doc_type]} expires ${shortDate(d.expires_on)}`, tone: "warn" as const, tab: "documents" as const, action: "Open" })),
  ];

  const upcoming: Upcoming[] = [
    ...openMaintenance.map(m => ({ id: `m-${m.id}`, date: m.next_due, title: m.title, kind: "Compliance" })),
    ...documents.filter(d => d.expires_on).map(d => ({ id: `d-${d.id}`, date: d.expires_on as string, title: `${d.title} expires`, kind: "Document" })),
    ...openRoadmap.filter(r => r.target_date).map(r => ({ id: `r-${r.id}`, date: r.target_date as string, title: r.title, kind: "Roadmap target" })),
  ]
    .filter(u => { const d = daysUntil(u.date); return d >= 0 && d <= 30; })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const statusCounts = COLUMNS.map(col => ({ ...col, n: roadmap.filter(r => r.status === col.id).length }));

  return (
    <div className={c.stack}>
      <div className={f.vitals}>
        <button className={f.vital} onClick={() => router.push("/dashboard/organizations")}>
          <span className={f.vitalLabel}>Customers</span>
          <span className={f.vitalValue}>{orgs.length}</span>
          <span className={f.vitalSub}>{running} running{flaggedOrgs > 0 ? `, ${flaggedOrgs} flagged` : ""}</span>
        </button>
        <button className={f.vital} onClick={() => router.push("/dashboard/finance")}>
          <span className={f.vitalLabel}>Monthly recurring revenue</span>
          <span className={f.vitalValue}>{kes(mrr)}</span>
          <span className={f.vitalSub}>See company finances</span>
        </button>
        <button className={f.vital} onClick={() => goTo("roadmap")}>
          <span className={f.vitalLabel}>Roadmap</span>
          <span className={f.vitalValue}>{openRoadmap.length} open</span>
          <span className={f.vitalSub}>{inProgress.length} in progress</span>
        </button>
        <button className={f.vital} onClick={() => goTo("compliance")}>
          <span className={f.vitalLabel}>Compliance</span>
          <span className={`${f.vitalValue} ${overdueMaintenance.length > 0 ? f.owed : ""}`}>{overdueMaintenance.length > 0 ? `${overdueMaintenance.length} overdue` : "On track"}</span>
          <span className={f.vitalSub}>{dueSoon.length} due this week · {activePeople} on the team</span>
        </button>
      </div>

      <div className={c.overviewGrid}>
        <div className={c.stack}>
          <section aria-labelledby="ov-attn">
            <div className={f.sectionHead}>
              <h2 id="ov-attn" className={f.sectionTitle}>Needs your attention</h2>
              <span className={f.sectionSub}>{attention.length === 0 ? "All clear" : `${attention.length} ${attention.length === 1 ? "item" : "items"}`}</span>
            </div>
            {attention.length === 0 ? (
              <div className={f.empty}><strong>Nothing needs you right now.</strong>Overdue filings, expiring documents, unpaid invoices and flagged customers will show up here.</div>
            ) : (
              attention.slice(0, 8).map(a => (
                <div key={a.id} className={c.attnRow}>
                  <span className={`${f.statusDot} ${a.tone === "bad" ? f.dotCritical : f.dotWarning}`} aria-hidden="true" />
                  <div className={c.attnMain}>
                    <span className={f.rowName}>{a.title}</span>
                    <span className={f.rowSub}>{a.detail}</span>
                  </div>
                  <button className={f.linkBtn} onClick={() => (a.tab ? goTo(a.tab) : router.push(a.href as string))}>{a.action}</button>
                </div>
              ))
            )}
          </section>

          <section aria-labelledby="ov-road">
            <div className={f.sectionHead}>
              <h2 id="ov-road" className={f.sectionTitle}>Product progress</h2>
              <button className={f.linkBtn} onClick={() => goTo("roadmap")}>Open roadmap</button>
            </div>
            {roadmap.length === 0 ? (
              <div className={f.empty}><strong>No roadmap yet.</strong>Add what you plan to build to see progress here.</div>
            ) : (
              <>
                <div className={c.progress} role="img" aria-label={statusCounts.map(s => `${s.n} ${s.label}`).join(", ")}>
                  {statusCounts.filter(s => s.n > 0).map(s => <span key={s.id} className={c[`p-${s.id}`]} style={{ flex: s.n }} />)}
                </div>
                <div className={c.progressLegend}>
                  {statusCounts.map(s => <span key={s.id}><i className={c[`p-${s.id}`]} />{s.label} {s.n}</span>)}
                </div>
                {inProgress.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    {inProgress.slice(0, 4).map(r => (
                      <div key={r.id} className={f.row}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span className={f.rowName}>{r.title}</span>
                          <span className={f.rowSub}>{r.area}{r.target_date ? ` · target ${shortDate(r.target_date)}` : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <div className={c.stack}>
          <section aria-labelledby="ov-soon">
            <div className={f.sectionHead}>
              <h2 id="ov-soon" className={f.sectionTitle}>Next 30 days</h2>
            </div>
            {upcoming.length === 0 ? (
              <div className={f.empty}><strong>Nothing dated in the next 30 days.</strong>Due dates, expiries and roadmap targets appear here.</div>
            ) : (
              <ul className={c.timeline}>
                {upcoming.map(u => {
                  const d = new Date(u.date);
                  return (
                    <li key={u.id} className={c.timeItem}>
                      <div className={c.timeDate}>{d.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}<small>{d.toLocaleDateString("en-KE", { weekday: "short" })}</small></div>
                      <div><div className={f.feedTitle}>{u.title}</div><div className={f.feedSub}>{u.kind}</div></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="ov-about">
            <div className={f.sectionHead}>
              <h2 id="ov-about" className={f.sectionTitle}>Company details</h2>
              <button className={f.linkBtn} onClick={() => goTo("profile")}>Edit</button>
            </div>
            <dl className={c.defs} style={{ marginTop: 4 }}>
              {[["Registration no.", profile?.registration_number], ["KRA PIN", profile?.tax_pin], ["Email", profile?.official_email], ["Phone", profile?.phone], ["Address", profile?.registered_address]].map(([label, value]) => (
                <div key={label as string} style={{ gridTemplateColumns: "130px 1fr" }}>
                  <dt>{label}</dt>
                  <dd>{value ? value : <span className={c.missing}>Not set</span>}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}