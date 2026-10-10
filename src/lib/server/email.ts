import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "AUREVYN <welcome@resend.dev>";

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Sends one email from the server. Returns false (never throws) when email isn't
// configured or fails, so a missing mail setup can never break the action that triggered it.
export async function sendEmail(to: string | string[], subject: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string): Promise<boolean> {
  if (!resend) return false;
  const button = ctaLabel && ctaUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" style="background:#C9A227;color:#1A0F14;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:8px;display:inline-block">${escapeHtml(ctaLabel)}</a></p>`
    : "";
  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#222">${bodyHtml}${button}<p style="color:#888;font-size:12px;margin-top:28px">AUREVYN</p></div>`,
    });
    if (error) { console.error("Email send failed:", error); return false; }
    return true;
  } catch (err) {
    console.error("Email send threw:", err);
    return false;
  }
}
