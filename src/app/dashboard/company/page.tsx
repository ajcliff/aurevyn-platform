"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ErrorBanner from "@/components/ErrorBanner";
import Overview, { type CompanyTab } from "@/components/company/Overview";
import Roadmap from "@/components/company/Roadmap";
import Compliance from "@/components/company/Compliance";
import Team from "@/components/company/Team";
import Documents, { docState } from "@/components/company/Documents";
import Profile from "@/components/company/Profile";
import { daysUntil } from "@/components/company/utils";
import { getCompanyProfile, type CompanyProfile } from "@/lib/companyProfile";
import { getRoadmapItems, type RoadmapItem } from "@/lib/roadmap";
import { getMaintenanceItems, type MaintenanceItem } from "@/lib/maintenance";
import { getCompanyMembers, type CompanyMember } from "@/lib/companyTeam";
import { getCompanyDocuments, type CompanyDocument } from "@/lib/companyDocuments";
import { getOrganizations, type Organization } from "@/lib/organizations";
import { getPackages, type Package } from "@/lib/packages";
import { getInvoices, type Invoice } from "@/lib/invoices";
import { formatError } from "@/lib/errorFormat";
import { logError } from "@/lib/errorLog";
import f from "@/styles/founder.module.css";
import c from "@/styles/company.module.css";

const TABS: { id: CompanyTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "roadmap", label: "Roadmap" },
  { id: "compliance", label: "Compliance" },
  { id: "team", label: "Team" },
  { id: "documents", label: "Documents" },
  { id: "profile", label: "Profile" },
];

export default function CompanyPage() {
  const router = useRouter();
  const [tab, setTab] = useState<CompanyTab>("overview");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [unavailable, setUnavailable] = useState<{ team?: string; documents?: string }>({});

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const report = useCallback((err: unknown, source: string) => {
    const message = formatError(err);
    setErrors(prev => (prev.includes(message) ? prev : [...prev, message]));
    logError({ source, message });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    setUnavailable({});

    // Each source loads on its own, so one failing table (for example the new team/documents tables
    // before the SQL has been run) doesn't blank the whole page.
    const [prof, road, maint, team, docs, orgList, pkgs, invs] = await Promise.allSettled([
      getCompanyProfile(), getRoadmapItems(), getMaintenanceItems(), getCompanyMembers(),
      getCompanyDocuments(), getOrganizations(), getPackages(), getInvoices(),
    ]);

    if (prof.status === "fulfilled") setProfile(prof.value); else report(prof.reason, "CompanyPage/profile");
    if (road.status === "fulfilled") setRoadmap(road.value); else report(road.reason, "CompanyPage/roadmap");
    if (maint.status === "fulfilled") setMaintenance(maint.value); else report(maint.reason, "CompanyPage/maintenance");
    if (team.status === "fulfilled") setMembers(team.value); else setUnavailable(u => ({ ...u, team: formatError(team.reason) }));
    if (docs.status === "fulfilled") setDocuments(docs.value); else setUnavailable(u => ({ ...u, documents: formatError(docs.reason) }));
    if (orgList.status === "fulfilled") setOrgs(orgList.value); else report(orgList.reason, "CompanyPage/orgs");
    if (pkgs.status === "fulfilled") setPackages(pkgs.value); else report(pkgs.reason, "CompanyPage/packages");
    if (invs.status === "fulfilled") setInvoices(invs.value);

    setLoading(false);
  }, [report]);

  useEffect(() => { load(); }, [load]);

  const overdueCompliance = maintenance.filter(m => !(m.frequency === "one_off" && m.last_completed) && daysUntil(m.next_due) < 0).length;
  const docsNeedingAttention = documents.filter(d => docState(d) === "expired" || docState(d) === "expiring").length;
  const badge: Partial<Record<CompanyTab, number>> = { compliance: overdueCompliance, documents: docsNeedingAttention };

  const displayName = profile?.trading_name || profile?.legal_name || "AUREVYN";
  const metaBits = [profile?.company_type, profile?.industry, profile?.country].filter(Boolean);

  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <header className={f.top}>
            <div>
              <p className={f.greeting}>Company</p>
              <h1 className={c.name}>{displayName}</h1>
              {profile?.legal_name && profile.trading_name && profile.legal_name !== profile.trading_name && (
                <p className={c.identity} style={{ marginTop: 6 }}>{profile.legal_name}</p>
              )}
              {profile?.description && <p className={c.identity}>{profile.description}</p>}
              {(metaBits.length > 0 || profile?.registration_number || profile?.tax_pin) && (
                <div className={c.metaLine}>
                  {metaBits.map((m, i) => <span key={i}>{m}</span>)}
                  {profile?.registration_number && <span>Reg. <b>{profile.registration_number}</b></span>}
                  {profile?.tax_pin && <span>KRA PIN <b>{profile.tax_pin}</b></span>}
                </div>
              )}
            </div>
            <div className={f.actions}>
              <button className={f.secondary} onClick={() => router.push("/dashboard/finance")}>Company finances</button>
            </div>
          </header>

          {errors.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {errors.map(msg => <ErrorBanner key={msg} message={msg} source="dashboard/company" onRetry={load} />)}
            </div>
          )}

          <div>
            <div className={f.tabs} role="tablist" aria-label="Company sections">
              {TABS.map(t => (
                <button key={t.id} role="tab" id={`co-tab-${t.id}`} aria-selected={tab === t.id} aria-controls="co-panel" className={f.tab} onClick={() => setTab(t.id)}>
                  {t.label}{badge[t.id] ? ` (${badge[t.id]})` : ""}
                </button>
              ))}
            </div>

            <div id="co-panel" role="tabpanel" aria-labelledby={`co-tab-${tab}`} style={{ paddingTop: 28 }}>
              {loading ? (
                <p className={f.status} role="status">Loading company…</p>
              ) : (
                <>
                  {tab === "overview" && (
                    <Overview profile={profile} orgs={orgs} packages={packages} invoices={invoices} roadmap={roadmap} maintenance={maintenance} documents={documents} members={members} goTo={setTab} />
                  )}
                  {tab === "roadmap" && <Roadmap items={roadmap} setItems={setRoadmap} onError={report} />}
                  {tab === "compliance" && <Compliance items={maintenance} setItems={setMaintenance} onError={report} />}
                  {tab === "team" && <Team members={members} setMembers={setMembers} onError={report} unavailable={unavailable.team} />}
                  {tab === "documents" && <Documents docs={documents} setDocs={setDocuments} onError={report} unavailable={unavailable.documents} />}
                  {tab === "profile" && <Profile profile={profile} setProfile={setProfile} onError={report} />}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}