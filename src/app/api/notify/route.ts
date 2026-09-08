import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Server-only env var - never prefixed with NEXT_PUBLIC_, so it's not exposed to the browser.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "AUREVYN <onboarding@resend.dev>";
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
            <p><strong>${payload.orgName}</strong> is now live on AUREVYN. You've got full access to every engine for the next 30 days, on us — plenty of time to see what actually fits how your business runs.</p>
            <p>Log in any time to explore, add your team, and get set up.</p>
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
