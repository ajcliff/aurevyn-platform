import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/server/email";
import { ONBOARDING_STEPS } from "@/lib/server/onboardingEmails";

// Runs once a day (see vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>".
// With no CRON_SECRET set, this refuses to run at all.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }

  const lastDay = Math.max(...ONBOARDING_STEPS.map((s) => s.day));
  const since = new Date(Date.now() - (lastDay + 2) * 86_400_000).toISOString();
  const { data: orgs } = await supabaseAdmin.from("organizations").select("id, name, created_at").gte("created_at", since);

  let sent = 0;
  for (const org of orgs ?? []) {
    const ageDays = (Date.now() - new Date(org.created_at).getTime()) / 86_400_000;
    const { data: done } = await supabaseAdmin.from("onboarding_emails_sent").select("step").eq("org_id", org.id);
    const doneKeys = new Set((done ?? []).map((d) => d.step));

    // One email per run at most: the latest step that is due and not yet sent, so a missed day never causes a pile-up
    const due = ONBOARDING_STEPS.filter((s) => ageDays >= s.day && !doneKeys.has(s.key)).pop();
    if (!due) continue;
    // Steps that were already skipped past (newer one due) are marked done so they are not sent later out of order
    const skipped = ONBOARDING_STEPS.filter((s) => s.day < due.day && !doneKeys.has(s.key));

    const { data: owners } = await supabaseAdmin.from("org_users").select("email, full_name").eq("org_id", org.id).eq("role", "owner");
    const owner = (owners ?? []).find((o) => o.email);
    if (!owner?.email) continue;

    const ok = await sendEmail(
      owner.email,
      due.subject,
      due.body({ name: owner.full_name?.split(" ")[0] || "there", orgName: org.name }),
      due.cta,
      `${req.nextUrl.origin}${due.path(org.id)}`
    );
    if (!ok) continue;

    await supabaseAdmin.from("onboarding_emails_sent").insert([due, ...skipped].map((s) => ({ org_id: org.id, step: s.key })));
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
