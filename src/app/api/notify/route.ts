import { NextRequest, NextResponse } from "next/server";
import { escapeHtml, sendEmail } from "@/lib/server/email";

const FOUNDER_ALERT_EMAIL = process.env.FOUNDER_ALERT_EMAIL;

// Only one kind of notification is accepted here: a critical-error alert to the founder.
// The recipient is never taken from the request, so this cannot be used to send mail to other people.
// (Welcome emails are sent by /api/register/finalize.)
type NotifyPayload = { type: "critical_error"; source: string; message: string; orgId?: string | null };

export async function POST(req: NextRequest) {
  let payload: NotifyPayload;
  try {
    payload = (await req.json()) as NotifyPayload;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (payload?.type !== "critical_error") return NextResponse.json({ error: "Unknown notification." }, { status: 400 });

  if (!FOUNDER_ALERT_EMAIL) {
    console.warn("FOUNDER_ALERT_EMAIL not set - skipping critical error alert.");
    return NextResponse.json({ skipped: true });
  }

  const clip = (v: unknown) => escapeHtml(String(v ?? "").slice(0, 500));
  const sent = await sendEmail(
    FOUNDER_ALERT_EMAIL,
    `AUREVYN critical error: ${String(payload.source ?? "").slice(0, 80)}`,
    `<h3 style="color:#dc2626;margin:0 0 8px">Critical error logged</h3>` +
      `<p><strong>Source:</strong> ${clip(payload.source)}</p>` +
      `<p><strong>Message:</strong> ${clip(payload.message)}</p>` +
      (payload.orgId ? `<p><strong>Org ID:</strong> ${clip(payload.orgId)}</p>` : "") +
      `<p style="color:#888;font-size:12px">Check the Error Logs page in the founder dashboard for full context.</p>`
  );
  return NextResponse.json({ sent });
}
