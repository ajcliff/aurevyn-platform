import { escapeHtml } from "@/lib/server/email";

// The short series sent after the welcome email. Each step goes out once per organization,
// at least `day` days after it was created. Plain, practical, and only about what exists today.
export type OnboardingStep = {
  key: string;
  day: number;
  subject: string;
  cta: string;
  path: (orgId: string) => string;
  body: (v: { name: string; orgName: string }) => string;
};

const li = (items: string[]) => `<ol style="line-height:1.7;padding-left:20px">${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
const hi = (name: string) => `<p>Hello ${escapeHtml(name)},</p>`;

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: "day1_first_sale",
    day: 1,
    subject: "Make your first sale in about five minutes",
    cta: "Open the till",
    path: (id) => `/org/${id}/pos`,
    body: ({ name, orgName }) =>
      hi(name) +
      `<p>Here is the quickest way to get <strong>${escapeHtml(orgName)}</strong> selling:</p>` +
      li([
        "Add your products in <strong>Inventory</strong>, one at a time or by importing a list, with prices and stock counts.",
        "Add a cash or M-Pesa account in <strong>Finance</strong>, so every sale has somewhere to land.",
        "Open <strong>Point of Sale</strong>, tap a product, take payment, and print or send the receipt.",
      ]) +
      `<p>If the internet drops while the till is open, sales keep saving and sync when you are back online. You can also install the Windows app from the Download page on our website.</p>`,
  },
  {
    key: "day3_team",
    day: 3,
    subject: "Add your team and decide who can do what",
    cta: "Open Users",
    path: (id) => `/org/${id}/users`,
    body: ({ name }) =>
      hi(name) +
      `<p>You create your team's accounts yourself, so there is nothing to send or wait for:</p>` +
      li([
        "Go to <strong>Users</strong> and press <strong>Create User</strong>.",
        "Give each person a <strong>username</strong> (an email is optional) and choose their role and engines. Hand over the temporary password. They choose their own when they first sign in.",
        "If someone forgets their password, press <strong>Reset password</strong> next to their name.",
      ]) +
      `<p><strong>Roles:</strong> an <em>owner</em> holds everything including billing. An <em>admin</em> runs the system but not billing. A <em>manager</em> approves requests and sees financial reports. <em>Staff</em> use the engines they are given.</p>` +
      `<p>Once you have more than ten people, set up <strong>departments</strong> so requests reach the right department head before the owners.</p>`,
  },
  {
    key: "day7_paperwork",
    day: 7,
    subject: "Keep your paperwork and approvals in one place",
    cta: "Open Documents",
    path: (id) => `/org/${id}/documents`,
    body: ({ name }) =>
      hi(name) +
      `<p>A few things that save time once you are trading:</p>` +
      li([
        "<strong>Documents</strong> shows your purchase orders, sales receipts and invoices in one list, next to files you upload.",
        "<strong>Approvals</strong>: staff raise requests, approvers get an email with Approve and Reject buttons, and every decision is recorded.",
        "<strong>Mail</strong> is for your own team and for AUREVYN Support. You can attach documents and use templates so you do not retype the same message.",
        "<strong>Credit Customers</strong> (under Finance) tracks who owes you, and a Send reminder button opens a ready-made message in WhatsApp, SMS or email.",
      ]),
  },
  {
    key: "day14_trial",
    day: 14,
    subject: "Halfway through your trial: what to keep",
    cta: "See your engines",
    path: (id) => `/org/${id}/engines`,
    body: ({ name, orgName }) =>
      hi(name) +
      `<p><strong>${escapeHtml(orgName)}</strong> is about halfway through the 30-day trial, with every engine switched on.</p>` +
      `<p>Before it ends, look at which engines your team really uses and keep those, with the number of seats each one needs. You only pay for what you keep.</p>` +
      `<p>Questions or ideas? Write to Support from <strong>Mail</strong> inside AUREVYN. We read every message. AUREVYN is one platform shared by many businesses, so we cannot change it for a single business, but good ideas can be added for everyone. Custom work, where we agree to it, may carry a fee.</p>`,
  },
];
