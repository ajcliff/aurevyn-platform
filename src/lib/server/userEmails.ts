import { supabaseAdmin } from "@/lib/supabase/server";
import { escapeHtml, sendEmail } from "@/lib/server/email";

// The emails every new person gets:
//   1. Welcome (organization owner only, at signup)
//   2. A role email: what they can do, which engines they have, and what they cannot do
//   3. A guide: how AUREVYN is laid out, gated vs always-open pages, and their own Self Service space
// Images are illustrations hosted in /public/email and must be reachable without signing in (see PUBLIC_ROUTES in proxy.ts).

type Role = "owner" | "admin" | "manager" | "staff";

const img = (origin: string, file: string, alt: string) =>
  `<img src="${origin}/email/${file}" alt="${escapeHtml(alt)}" width="520" style="width:100%;max-width:520px;height:auto;border-radius:10px;margin:14px 0;display:block" />`;
const ul = (items: string[]) => `<ul style="line-height:1.7;padding-left:20px">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const first = (name: string) => escapeHtml(name.trim().split(/\s+/)[0] || "there");

const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", manager: "Manager", staff: "Staff" };

const ROLE_COPY: Record<Role, { tasks: string[]; can: string[]; cannot: string[] }> = {
  owner: {
    tasks: [
      "Create your team's accounts under <strong>Users</strong> and decide which engines each person gets.",
      "Choose which engines and how many seats to keep before the free trial ends, under <strong>Engines</strong>.",
      "Approve or reject requests, and check the reports.",
      "Pay and review AUREVYN invoices under <strong>Billing</strong>.",
    ],
    can: [
      "Everything in your organization, including organization settings and billing.",
      "Create admins, managers, staff and other owners.",
      "Reset anyone's password from the Users page.",
    ],
    cannot: [
      "Use an engine your plan does not include. Add it, or more seats, from the Engines page.",
      "Change how AUREVYN itself works. It is one platform shared by many businesses.",
    ],
  },
  admin: {
    tasks: [
      "Create accounts for staff under <strong>Users</strong>, give them a role and the engines they need, and reset passwords when someone is locked out.",
      "Keep the organization's settings and engine access in order.",
      "Approve or reject requests that reach you.",
    ],
    can: [
      "Manage users, engine access and organization settings.",
      "Open the Billing page.",
      "Approve requests and see financial reports.",
    ],
    cannot: [
      "Create another owner. Only an owner can.",
      "Use an engine that has not been licensed to you, or that your organization does not have.",
    ],
  },
  manager: {
    tasks: [
      "Approve or reject the requests your team raises (purchases, expenses, salary advances).",
      "Check financial reports to keep an eye on spending.",
      "Work in the engines you have been given.",
    ],
    can: [
      "Approve or reject requests.",
      "See financial reports.",
      "Use your engines, Self Service and Mail like everyone else.",
    ],
    cannot: [
      "Add or remove people, or change who has which engine. Ask an owner or admin.",
      "Open Users, Billing or organization Settings.",
    ],
  },
  staff: {
    tasks: [
      "Do your day-to-day work in the engines you have been given, for example the till, stock or customers.",
      "Raise requests that need sign-off, such as a purchase or a salary advance, where your engines allow it.",
      "Use Self Service for your own leave and payslips.",
    ],
    can: [
      "Use your engines, Self Service and Mail.",
      "Raise requests that need sign-off.",
    ],
    cannot: [
      "Approve requests.",
      "Open Users, Billing or organization Settings.",
      "Open an engine you have not been given. Ask your owner or admin for a seat.",
    ],
  },
};

// Names of the engines a person has: a list of engine ids, a list of slugs, or null meaning "every engine the organization has"
async function engineNames(orgId: string, opts: { engineIds?: string[]; slugs?: string[] | null }): Promise<string[] | null> {
  if (opts.engineIds) {
    if (!opts.engineIds.length) return [];
    const { data } = await supabaseAdmin.from("engines").select("name").in("id", opts.engineIds);
    return (data ?? []).map((e) => e.name).sort();
  }
  if (opts.slugs) {
    if (!opts.slugs.length) return [];
    const { data } = await supabaseAdmin.from("engines").select("name").in("slug", opts.slugs);
    return (data ?? []).map((e) => e.name).sort();
  }
  return null;
}

export async function sendWelcomeEmail(to: string, ownerName: string, orgName: string, origin: string, orgId: string): Promise<boolean> {
  return sendEmail(
    to,
    "Welcome to AUREVYN",
    `<h2 style="margin:0 0 8px">Welcome aboard, ${first(ownerName)}!</h2>` +
      `<p><strong>${escapeHtml(orgName)}</strong> is live on AUREVYN, with every engine switched on for the next 30 days. No card needed.</p>` +
      img(origin, "first-steps.png", "Four steps to your first sale") +
      `<p>The same four steps appear as a checklist on your dashboard and tick themselves off as you go. You can also install the Windows app from the Download page on our website.</p>` +
      `<p>In the next two emails we explain what your role lets you do and how the platform is laid out. Stuck on anything? Open <strong>Mail</strong> inside AUREVYN and write to Support. We read every message.</p>`,
    "Open your dashboard",
    `${origin}/org/${orgId}`
  );
}

export async function sendRoleEmail(p: {
  to: string;
  name: string;
  role: Role;
  orgId: string;
  orgName: string;
  origin: string;
  engineIds?: string[];
  slugs?: string[] | null;
  loginName?: string | null;
}): Promise<boolean> {
  const copy = ROLE_COPY[p.role] ?? ROLE_COPY.staff;
  const names = await engineNames(p.orgId, { engineIds: p.engineIds, slugs: p.slugs });
  const engineLine =
    names === null
      ? "Every engine your organization has. During the free trial that is all ten."
      : names.length
        ? `${names.map(escapeHtml).join(", ")}.`
        : "None yet. Ask your owner or admin to give you the engines you need.";
  const signIn = p.loginName
    ? `<p>You sign in with <strong>${escapeHtml(p.loginName)}</strong> and the temporary password your administrator gave you. You will be asked to choose your own password the first time.</p>`
    : "";

  return sendEmail(
    p.to,
    `Your AUREVYN account at ${p.orgName}: what you can do as ${ROLE_LABEL[p.role]}`,
    `<p>Hello ${first(p.name)},</p>` +
      `<p>You are an <strong>${ROLE_LABEL[p.role]}</strong> at <strong>${escapeHtml(p.orgName)}</strong> on AUREVYN.</p>` +
      signIn +
      `<h3 style="margin:22px 0 4px">Your tasks</h3>${ul(copy.tasks)}` +
      `<h3 style="margin:22px 0 4px">Your engines</h3><p>${engineLine}</p>` +
      `<h3 style="margin:22px 0 4px">What you can do</h3>${ul(copy.can)}` +
      `<h3 style="margin:22px 0 4px">What you cannot do</h3>${ul(copy.cannot)}` +
      img(p.origin, "roles.png", "What each role can do") +
      `<p>Not sure about something? Ask the owner or admin at ${escapeHtml(p.orgName)}, or write to Support from <strong>Mail</strong>.</p>`,
    "Open AUREVYN",
    `${p.origin}/org/${p.orgId}`
  );
}

export async function sendGuideEmail(to: string, name: string, orgId: string, origin: string): Promise<boolean> {
  return sendEmail(
    to,
    "How AUREVYN is laid out: engines, your profile and your own space",
    `<p>Hello ${first(name)},</p>` +
      `<p>AUREVYN has two kinds of pages. Knowing which is which explains why you see some things and not others.</p>` +
      `<h3 style="margin:22px 0 4px">Engines (need a seat)</h3>` +
      `<p>An engine is a part of the business: the till, stock, money, customers and so on. Each one needs a licence, and your owner or admin chooses who gets which. If you open one you were not given, AUREVYN tells you it is not available to you. Some engines also unlock pages that sit in the menu: Inventory brings Warehouses, Pricelists, Stock Takes and Fleet &amp; Delivery; Finance brings Approvals; HR &amp; Payroll brings the HR Directory; Business Operations brings Documents, Knowledge Base and Activity.</p>` +
      img(origin, "engines-map.png", "Engines that need a seat, and pages that are always open") +
      `<h3 style="margin:22px 0 4px">Always open</h3>` +
      ul([
        "<strong>Overview</strong>: your dashboard, with a checklist while the business is being set up.",
        "<strong>Self Service</strong>: your own profile. Request leave, see your leave history and payslips, and read company announcements.",
        "<strong>Mail</strong>: messages to colleagues, and to AUREVYN Support. You can attach documents and use ready-made templates.",
        "<strong>Engines</strong>: which engines your organization has.",
      ]) +
      `<p>Owners and admins also see <strong>Users</strong>, <strong>Billing</strong> and <strong>Settings</strong>.</p>` +
      `<h3 style="margin:22px 0 4px">Your own space</h3>` +
      img(origin, "self-service.png", "The Self Service page") +
      ul([
        "<strong>Self Service</strong>: open it from the left menu. Use <em>Request Leave</em> to ask for time off, <em>Leave History</em> to see the answer, and <em>Payroll History</em> for your payslips.",
        "<strong>The bell</strong> at the top shows notifications meant for you.",
        "<strong>Quick Notes</strong>: jot reminders that are private to you, or shared with your team.",
        "<strong>Shared with me</strong>: files and projects other people have opened up to you appear here.",
        "<strong>Your password</strong>: you chose it at your first sign-in. If you forget it, use Forgot password on the sign-in page, or ask your owner or admin to reset it (the only option if you sign in with a username).",
      ]),
    "Open Self Service",
    `${origin}/org/${orgId}/me`
  );
}

// Role email followed by the guide, for anyone who has just been given an account.
export async function sendNewUserEmails(p: {
  to: string;
  name: string;
  role: Role;
  orgId: string;
  orgName: string;
  origin: string;
  engineIds?: string[];
  slugs?: string[] | null;
  loginName?: string | null;
}): Promise<void> {
  await sendRoleEmail(p);
  await sendGuideEmail(p.to, p.name, p.orgId, p.origin);
}
