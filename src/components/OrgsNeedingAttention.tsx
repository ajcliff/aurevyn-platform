"use client";

import { useRouter } from "next/navigation";
import type { Organization } from "@/lib/organizations";
import f from "@/styles/founder.module.css";

const rank: Record<string, number> = { critical: 0, warning: 1 };
const label: Record<string, string> = { critical: "Critical", warning: "Needs review" };

export default function OrgsNeedingAttention({
  orgs,
  onStatusChange,
}: {
  orgs: Organization[];
  onStatusChange: (id: string, status: Organization["status"]) => void;
}) {
  const router = useRouter();
  const flagged = orgs
    .filter(o => o.status !== "operational")
    .sort((a, b) => (rank[a.status] ?? 2) - (rank[b.status] ?? 2));

  return (
    <section aria-labelledby="attention-title">
      <div className={f.sectionHead}>
        <h2 id="attention-title" className={f.sectionTitle}>Needs your attention</h2>
        <span className={f.sectionSub}>{flagged.length === 0 ? "None flagged" : `${flagged.length} flagged`}</span>
      </div>

      {flagged.length === 0 ? (
        <div className={f.empty}>
          <strong>Nothing needs you right now.</strong>
          Organizations marked Warning or Critical will show up here.
        </div>
      ) : (
        flagged.map(org => (
          <div key={org.id} className={f.row}>
            <span className={`${f.statusDot} ${org.status === "critical" ? f.dotCritical : f.dotWarning}`} aria-hidden="true" />
            <button className={f.rowMain} onClick={() => router.push(`/dashboard/organizations?highlight=${org.id}`)}>
              <span className={f.rowName}>{org.name}</span>
              <span className={f.rowSub}>{label[org.status]} · {org.location}</span>
            </button>
            <select
              aria-label={`Status for ${org.name}`}
              className={`${f.select} ${f.selectSm}`}
              value={org.status}
              onChange={e => onStatusChange(org.id, e.target.value as Organization["status"])}
            >
              <option value="operational">Operational</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        ))
      )}
    </section>
  );
}