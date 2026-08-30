"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getOrgRuntime } from "@/lib/runtime/getOrgRuntime";
import { getMyMembership, type MyMembership } from "@/lib/runtime/getMyMembership";
import { EngineProvider } from "@/lib/runtime/EngineContext";
import { PageHeaderProvider, usePageHeader } from "@/lib/runtime/PageHeaderContext";
import type { Organization, InstalledEngine } from "@/lib/runtime/models";
import { getOrgNotifications, type OrgNotification } from "@/lib/orgNotifications";
import CommandPalette from "@/components/CommandPalette";
import EmptyState from "@/components/EmptyState";
import { searchOrgData } from "@/lib/orgSearch";
import { getMyEmployeeRecord } from "@/lib/employeeHub";
import { createClient } from "@/lib/supabase";
import { getOrgSettings, getOrgLogoUrl } from "@/lib/orgSettings";
import { getMyOrganizations, type MyOrgMembership } from "@/lib/runtime/getMyOrganizations";
import AskOrgBrain from "@/components/AskOrgBrain";

const ENGINE_ICONS: Record<string, string> = {
  inventory: "📦",
  pos: "🛒",
  finance: "💰",
  crm: "👥",
  "hr-payroll": "🧑‍💼",
  analytics: "📊",
  procurement: "📋",
  documents: "📄",
  "ai-insights": "✨",
  "business-ops": "🧭",
};

// Labels for fixed (non-engine) nav items, also used to auto-derive the page header title.
const NAV_LABELS: Record<string, string> = {
  activity: "Activity",
  approvals: "Approvals",
  documents: "Documents",
  knowledge: "Knowledge Base",
  employees: "Employee Hub",
  team: "Team",
  settings: "Settings",
  me: "My Profile",
  warehouses: "Warehouses",
  pricelists: "Pricelists",
  me: "My Profile",
};

const UNGATED_SEGMENTS = new Set([
  "me", "settings", "team", "employees", "activity", "approvals",
  "documents", "knowledge", "warehouses", "pricelists", "summary", undefined,
]);

const MOBILE_BREAKPOINT = 900;

const STATUS_COLORS: Record<string, string> = {
  operational: "#3ecf8e",
  warning: "#f5a623",
  critical: "#ef4444",
};

function getDefaultTitle(pathname: string, engines: InstalledEngine[]): string {
  const segments = pathname.split("/").filter(Boolean); // ["org", orgId, slug, ...]
  const slug = segments[2];
  if (!slug) return "Overview";
  if (NAV_LABELS[slug]) return NAV_LABELS[slug];
  const engine = engines.find((e) => e.engines?.slug === slug);
  return engine?.engines?.name ?? "AUREVYN";
}

export default function OrgLayout({ children }: { children: ReactNode }) {
  const { orgId } = useParams<{ orgId: string }>();
  const pathname = usePathname();
  const [showBrain, setShowBrain] = useState(false);
  const [notifications, setNotifications] = useState<OrgNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [engines, setEngines] = useState<InstalledEngine[]>([]);
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const [runtime, myMembership] = await Promise.all([
        getOrgRuntime(orgId),
        getMyMembership(orgId),
      ]);
      if (!active) return;

      if (!runtime) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrganization(runtime.organization);
      setEngines(runtime.engines);
      setMembership(myMembership);
      setLoading(false);

      const settings = await getOrgSettings(orgId);
      if (active) {
        setLogoUrl(getOrgLogoUrl(settings.logo_path));
        document.documentElement.setAttribute("data-theme", settings.theme);
      }

      if (myMembership) {
        const canManageTeam = myMembership.role === "owner" || myMembership.role === "admin";
        const hasInventory = runtime.engines.some((e) => e.engines?.slug === "inventory");
        const hasHR = runtime.engines.some((e) => e.engines?.slug === "hr-payroll");

        const myEmployeeRecord = myMembership.userId
          ? await getMyEmployeeRecord(orgId, myMembership.userId)
          : null;

        const notifs = await getOrgNotifications({
          orgId,
          hasInventory,
          hasHR,
          canManageTeam,
          canApprove: canManageTeam,
          employeeId: myEmployeeRecord?.id ?? null,
          department: myEmployeeRecord?.department ?? null,
        });
        setNotifications(notifs);
      }
    }

    load();
    return () => {
      active = false;
      document.documentElement.removeAttribute("data-theme");
    };
  }, [orgId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg-base)" }}>
        <EmptyState icon="⏳" message="Loading your organization..." />
      </div>
    );
  }

  if (notFound || !organization || !membership) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg-base)" }}>
        <EmptyState
          icon={!membership ? "🔒" : "🏢"}
          message={!membership ? "You don't have access to this organization." : "Organization not found."}
          actionLabel="Back to dashboard"
          onAction={() => { window.location.href = "/dashboard"; }}
        />
      </div>
    );
  }

  // Filter engines this specific person can see (owners/admins/managers see all org engines;
  // staff only see what's explicitly allowed, if restricted)
  const visibleEngines =
    membership.allowedEngines === null
      ? engines
      : engines.filter((e) => membership.allowedEngines!.includes(e.engines?.slug ?? ""));

  const canManageTeam = membership.role === "owner" || membership.role === "admin";

  const segments = pathname.split("/").filter(Boolean);
  const engineSlug = segments[2];
  const isGatedRoute = !UNGATED_SEGMENTS.has(engineSlug);
  const hasEngine = visibleEngines.some((e) => e.engines?.slug === engineSlug);

  if (engineSlug === "team" && !canManageTeam) {
    return (
      <EngineProvider organization={organization} installedEngines={visibleEngines} membership={membership}>
        <PageHeaderProvider>
          <OrgShell
            orgId={orgId}
            organization={organization}
            engines={visibleEngines}
            membership={membership}
            pathname={pathname}
            notifications={notifications}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            showBrain={showBrain}
            setShowBrain={setShowBrain}
            logoUrl={logoUrl}
          >
            <EmptyState icon="🚫" message="Only owners and admins can manage the team." />
          </OrgShell>
        </PageHeaderProvider>
      </EngineProvider>
    );
  }

  if (isGatedRoute && engineSlug !== "team" && !hasEngine) {
    return (
      <EngineProvider organization={organization} installedEngines={visibleEngines} membership={membership}>
        <PageHeaderProvider>
          <OrgShell
            orgId={orgId}
            organization={organization}
            engines={visibleEngines}
            membership={membership}
            pathname={pathname}
            notifications={notifications}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            showBrain={showBrain}
            setShowBrain={setShowBrain}
            logoUrl={logoUrl}
          >
            <EmptyState
              icon="🔒"
              message="This isn't part of your plan, or your role doesn't have access to it."
              actionLabel="Back to dashboard"
              onAction={() => { window.location.href = `/org/${orgId}`; }}
            />
          </OrgShell>
        </PageHeaderProvider>
      </EngineProvider>
    );
  }

  const orgCommands = [
    { id: "overview", label: "Overview", icon: "🏠", path: `/org/${orgId}` },
    ...visibleEngines.map((e) => ({
      id: e.id,
      label: e.engines?.name ?? e.engines?.slug ?? "",
      icon: ENGINE_ICONS[e.engines?.slug ?? ""] ?? "⚙️",
      path: `/org/${orgId}/${e.engines?.slug}`,
    })),
    { id: "activity", label: "Activity", icon: "🕐", path: `/org/${orgId}/activity` },
    { id: "approvals", label: "Approvals", icon: "✅", path: `/org/${orgId}/approvals` },
    { id: "documents", label: "Documents", icon: "📄", path: `/org/${orgId}/documents` },
    { id: "employees", label: "Employee Hub", icon: "🪪", path: `/org/${orgId}/employees` },
    { id: "me", label: "My Profile", icon: "🪪", path: `/org/${orgId}/me` },
  ];

  const installedSlugs = visibleEngines.map((e) => e.engines?.slug ?? "");

  return (
    <EngineProvider organization={organization} installedEngines={visibleEngines} membership={membership}>
      <PageHeaderProvider>
        <OrgShell
          orgId={orgId}
          organization={organization}
          engines={visibleEngines}
          membership={membership}
          pathname={pathname}
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          showBrain={showBrain}
          setShowBrain={setShowBrain}
          logoUrl={logoUrl}
        >
          {children}
        </OrgShell>
        <CommandPalette
          items={orgCommands}
          onSearchData={(q) => searchOrgData(orgId, q, installedSlugs, membership.userId)}
        />
      </PageHeaderProvider>
    </EngineProvider>
  );
}

function OrgShell({
  orgId,
  organization,
  engines,
  membership,
  pathname,
  notifications,
  showNotifications,
  setShowNotifications,
  showBrain,
  setShowBrain,
  logoUrl,
  children,
}: {
  orgId: string;
  organization: Organization;
  engines: InstalledEngine[];
  membership: MyMembership;
  pathname: string;
  notifications: OrgNotification[];
  showNotifications: boolean;
  setShowNotifications: (v: boolean) => void;
  showBrain: boolean;
  setShowBrain: (v: boolean) => void;
  logoUrl: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const canManageTeam = membership.role === "owner" || membership.role === "admin";
  const { header } = usePageHeader();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [myOrgs, setMyOrgs] = useState<MyOrgMembership[] | null>(null);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close mobile sidebar / notifications / switcher on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowNotifications(false);
    setShowSwitcher(false);
  }, [pathname, setShowNotifications]);

  // Lazy-load the org list only when the switcher is first opened
  useEffect(() => {
    if (showSwitcher && myOrgs === null) {
      getMyOrganizations().then(setMyOrgs);
    }
  }, [showSwitcher, myOrgs]);

  // Click-outside to close the org switcher
  useEffect(() => {
    if (!showSwitcher) return;
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSwitcher]);

  // Click-outside to close notifications
  useEffect(() => {
    if (!showNotifications) return;
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotifications, setShowNotifications]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function openSearch() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  }

  const sidebarWidth = isMobile ? 240 : collapsed ? 64 : 220;
  const showLabels = !collapsed || isMobile;

  const pageTitle = header?.title ?? getDefaultTitle(pathname, engines);
  const initial = (membership.userEmail ?? "?").charAt(0).toUpperCase();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-base)" }}>
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150 }}
        />
      )}

      <aside
        style={{
          width: sidebarWidth,
          borderRight: "1px solid var(--border)",
          padding: "20px 12px",
          flexShrink: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.15s ease, transform 0.2s ease",
          ...(isMobile
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                height: "100vh",
                zIndex: 200,
                background: "var(--bg-base)",
                transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
              }
            : {}),
        }}
      >
        <div style={{ padding: "0 8px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              ref={switcherRef}
              style={{ position: "relative", flex: 1, minWidth: 0 }}
            >
              <button
                onClick={() => setShowSwitcher(!showSwitcher)}
                title={organization.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  width: "100%",
                  textAlign: "left",
                }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={organization.name}
                    style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: "var(--gold)",
                      color: "var(--gold-contrast)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {organization.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {showLabels && (
                  <>
                    <span
                      style={{
                        color: "var(--gold)",
                        fontWeight: 800,
                        fontSize: 15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {organization.name}
                    </span>
                    <span
                      title={`Status: ${organization.status}`}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: STATUS_COLORS[organization.status] ?? "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>▾</span>
                  </>
                )}
              </button>

              {showSwitcher && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    width: 220,
                    maxHeight: 300,
                    overflowY: "auto",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                    zIndex: 300,
                  }}
                >
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
                    Switch organization
                  </div>

                  {myOrgs === null && (
                    <div style={{ padding: "14px 12px", fontSize: 12, color: "var(--text-muted)" }}>Loading...</div>
                  )}

                  {myOrgs?.length === 0 && (
                    <div style={{ padding: "14px 12px", fontSize: 12, color: "var(--text-muted)" }}>No other organizations.</div>
                  )}

                  {myOrgs?.map((m) => (
                    <Link
                      key={m.organization.id}
                      href={`/org/${m.organization.id}`}
                      onClick={() => setShowSwitcher(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        fontSize: 12,
                        textDecoration: "none",
                        color: m.organization.id === orgId ? "var(--gold)" : "var(--text-primary)",
                        fontWeight: m.organization.id === orgId ? 700 : 500,
                        background: m.organization.id === orgId ? "var(--bg-elevated)" : "transparent",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: STATUS_COLORS[m.organization.status] ?? "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.organization.name}
                      </span>
                    </Link>
                  ))}

                  <Link
                    href="/dashboard"
                    onClick={() => setShowSwitcher(false)}
                    style={{
                      display: "block",
                      padding: "10px 12px",
                      fontSize: 12,
                      textDecoration: "none",
                      color: "var(--text-muted)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    ← Founder dashboard
                  </Link>
                </div>
              )}
            </div>

            {!isMobile && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  width: 24,
                  height: 24,
                  flexShrink: 0,
                  marginLeft: 6,
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: 11,
                }}
              >
                {collapsed ? "»" : "«"}
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <SidebarLink
            href={`/org/${orgId}`}
            label="Overview"
            icon="🏠"
            active={pathname === `/org/${orgId}`}
            showLabel={showLabels}
          />

          {engines.map((installed) => (
            <SidebarLink
              key={installed.id}
              href={`/org/${orgId}/${installed.engines?.slug}`}
              label={installed.engines?.name ?? installed.engines?.slug ?? ""}
              icon={ENGINE_ICONS[installed.engines?.slug ?? ""] ?? "⚙️"}
              active={pathname.startsWith(`/org/${orgId}/${installed.engines?.slug}`)}
              showLabel={showLabels}
            />
          ))}

          {engines.some((e) => e.engines?.slug === "inventory") && (
            <SidebarLink
              href={`/org/${orgId}/warehouses`}
              label="Warehouses"
              icon="🏬"
              active={pathname.startsWith(`/org/${orgId}/warehouses`)}
              showLabel={showLabels}
            />
          )}

          {engines.some((e) => e.engines?.slug === "inventory") && (
            <SidebarLink
              href={`/org/${orgId}/pricelists`}
              label="Pricelists"
              icon="🏷️"
              active={pathname.startsWith(`/org/${orgId}/pricelists`)}
              showLabel={showLabels}
            />
          )}

          <div style={{ height: 1, background: "var(--border)", margin: "12px 4px" }} />

          <SidebarLink
            href={`/org/${orgId}/activity`}
            label="Activity"
            icon="🕐"
            active={pathname.startsWith(`/org/${orgId}/activity`)}
            showLabel={showLabels}
          />
          <SidebarLink
            href={`/org/${orgId}/approvals`}
            label="Approvals"
            icon="✅"
            active={pathname.startsWith(`/org/${orgId}/approvals`)}
            showLabel={showLabels}
          />
          <SidebarLink
            href={`/org/${orgId}/documents`}
            label="Documents"
            icon="📄"
            active={pathname.startsWith(`/org/${orgId}/documents`)}
            showLabel={showLabels}
          />
          <SidebarLink
            href={`/org/${orgId}/knowledge`}
            label="Knowledge Base"
            icon="📚"
            active={pathname.startsWith(`/org/${orgId}/knowledge`)}
            showLabel={showLabels}
          />
          <SidebarLink
            href={`/org/${orgId}/employees`}
            label="Employee Hub"
            icon="🪪"
            active={pathname.startsWith(`/org/${orgId}/employees`)}
            showLabel={showLabels}
          />
          <SidebarLink
            href={`/org/${orgId}/me`}
            label="My Profile"
            icon="👤"
            active={pathname.startsWith(`/org/${orgId}/me`)}
            showLabel={showLabels}
          />

          {canManageTeam && (
            <SidebarLink
              href={`/org/${orgId}/team`}
              label="Team"
              icon="🧑‍🤝‍🧑"
              active={pathname.startsWith(`/org/${orgId}/team`)}
              showLabel={showLabels}
            />
          )}

          {canManageTeam && (
            <SidebarLink
              href={`/org/${orgId}/settings`}
              label="Settings"
              icon="⚙️"
              active={pathname.startsWith(`/org/${orgId}/settings`)}
              showLabel={showLabels}
            />
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px" }}>
            <div
              title={membership.userEmail ?? undefined}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--gold)",
                color: "var(--gold-contrast)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            {showLabels && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {membership.userEmail ?? "Unknown user"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "capitalize" }}>
                  {membership.role}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            style={{
              width: "100%",
              marginTop: 6,
              padding: "8px 8px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: showLabels ? "flex-start" : "center",
              gap: 8,
            }}
          >
            <span>🚪</span>
            {showLabels && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px 0",
            flexShrink: 0,
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  cursor: "pointer",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                ☰
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pageTitle}
              </div>
              {header?.subtitle && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {header.subtitle}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {header?.actions?.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                style={{
                  background: action.variant === "secondary" ? "transparent" : "var(--gold)",
                  color: action.variant === "secondary" ? "var(--text-primary)" : "var(--gold-contrast)",
                  border: action.variant === "secondary" ? "1px solid var(--border)" : "none",
                  borderRadius: 10,
                  padding: "0 14px",
                  height: 36,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {action.label}
              </button>
            ))}

            <button
              onClick={openSearch}
              title="Search (Ctrl+K)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "0 12px",
                height: "36px",
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              <span>🔍</span>
              <span style={{ display: isMobile ? "none" : "inline" }}>Search...</span>
              <span
                style={{
                  fontSize: 10,
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  display: isMobile ? "none" : "inline",
                }}
              >
                Ctrl K
              </span>
            </button>

            <button
              onClick={() => setShowBrain(true)}
              style={{
                background: "var(--gold)",
                color: "var(--gold-contrast)",
                border: "none",
                borderRadius: "10px",
                padding: "0 14px",
                height: "36px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              ✨ Ask AUREVYN
            </button>

            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  width: "36px",
                  height: "36px",
                  cursor: "pointer",
                  fontSize: "16px",
                  position: "relative",
                }}
              >
                🔔
                {notifications.length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-4px",
                      background: "var(--gold)",
                      color: "var(--gold-contrast)",
                      borderRadius: "50%",
                      width: "16px",
                      height: "16px",
                      fontSize: "9px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "44px",
                    right: 0,
                    width: "340px",
                    maxHeight: "420px",
                    overflowY: "auto",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: "13px" }}>
                    Notifications
                  </div>

                  {notifications.length === 0 && (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                      Nothing right now.
                    </div>
                  )}

                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => setShowNotifications(false)}
                      style={{
                        display: "flex",
                        gap: "10px",
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border)",
                        textDecoration: "none",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span style={{ fontSize: "16px", flexShrink: 0 }}>{n.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>{n.title}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{n.detail}</div>
                        {n.time && <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{n.time}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden", padding: "0 20px 20px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {children}
        </div>
      </main>

      {showBrain && (
        <AskOrgBrain
          orgId={orgId}
          orgName={organization.name}
          installedSlugs={engines.map((e) => e.engines?.slug ?? "")}
          onClose={() => setShowBrain(false)}
        />
      )}
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  active,
  showLabel,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  showLabel: boolean;
}) {
  return (
    <Link
      href={href}
      title={showLabel ? undefined : label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        marginBottom: 4,
        textDecoration: "none",
        color: active ? "var(--gold-contrast)" : "var(--text-secondary)",
        background: active ? "var(--gold)" : "transparent",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        justifyContent: showLabel ? "flex-start" : "center",
      }}
    >
      <span>{icon}</span>
      {showLabel && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
    </Link>
  );
}
