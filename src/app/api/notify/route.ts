import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Server-only env var - never prefixed with NEXT_PUBLIC_, so it's not exposed to the browser.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "AUREVYN <welcome@resend.dev>";
const FOUNDER_ALERT_EMAIL = process.env.FOUNDER_ALERT_EMAIL;

type NotifyPayload =
  | { type: "welcome"; to: string; orgName: string; ownerName: string }
  | { type: "critical_error"; source: string; message: string; orgId?: string | null };

export async function POST(req: NextRequest) {
  if (!resend) {
    // Not configured yet - fail silently so this never breaks the app for
    // people who haven't set up RESEND_API_KEY. Logged server-side only.
    console.warn("RESEND_API_KEY not set - skipping email send.");
    return NextResponse.json({ skipped: true });
  }

  const payload = (await req.json()) as NotifyPayload;

  try {
    if (payload.type === "welcome") {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: payload.to,
        subject: `Welcome to AUREVYN, ${payload.orgName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2>Welcome aboard, ${payload.ownerName}!</h2>
            <p><strong>${payload.orgName}</strong> is live on AUREVYN, with every engine switched on for the next 30 days. No card needed.</p>
            <p><strong>Four steps to start trading:</strong></p>
            <ol style="line-height:1.7">
              <li>Add your products</li>
              <li>Add a cash or M-Pesa account</li>
              <li>Make your first sale at the till</li>
              <li>Invite your team</li>
            </ol>
            <p>You will find this as a checklist on your dashboard. It ticks itself off as you go. You can also install the Windows app from the Download page on our website.</p>
            <p>Stuck on anything? Open Mail inside AUREVYN and write to Support. We read every message.</p>
            <p style="color: #888; font-size: 13px; margin-top: 32px;">— The AUREVYN team</p>
          </div>
        `,
      });
    }

    if (payload.type === "critical_error") {
      if (!FOUNDER_ALERT_EMAIL) {
        console.warn("FOUNDER_ALERT_EMAIL not set - skipping critical error alert.");
        return NextResponse.json({ skipped: true });
      }
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: FOUNDER_ALERT_EMAIL,
        subject: `🚨 AUREVYN critical error: ${payload.source}`,
        html: `
          <div style="font-family: monospace; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h3 style="color: #dc2626;">Critical error logged</h3>
            <p><strong>Source:</strong> ${payload.source}</p>
            <p><strong>Message:</strong> ${payload.message}</p>
            ${payload.orgId ? `<p><strong>Org ID:</strong> ${payload.orgId}</p>` : ""}
            <p style="color: #888; font-size: 12px;">Check the Error Logs page in the founder dashboard for full context.</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Failed to send email:", err);
    // Never let an email failure break the caller's flow.
    return NextResponse.json({ sent: false }, { status: 200 });
  }
}
