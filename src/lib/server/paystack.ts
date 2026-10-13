import crypto from "crypto";

const BASE = "https://api.paystack.co";

export const paystackConfigured = () => !!process.env.PAYSTACK_SECRET_KEY;

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.status) throw new Error(json.message ?? "Paystack request failed.");
  return json.data;
}

// Starts a hosted checkout. Paystack takes amounts in the smallest unit (KES 100 = 10000).
export async function initializeTransaction(opts: {
  email: string;
  amountKes: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<{ authorization_url: string }> {
  return call("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: opts.email,
      amount: Math.round(opts.amountKes * 100),
      currency: "KES",
      reference: opts.reference,
      callback_url: opts.callbackUrl,
      metadata: opts.metadata,
    }),
  });
}

export type VerifiedTransaction = {
  status: string;
  amount: number;
  currency: string;
  channel: string;
  reference: string;
  metadata: { invoice_id?: string } | null;
};

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`);
}

// Paystack signs every webhook body with HMAC-SHA512 using the secret key.
export function validSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Receipts only allow these methods, so map Paystack's channel onto them.
export function receiptMethod(channel: string): "M-Pesa" | "Bank transfer" | "Other" {
  if (channel === "mobile_money") return "M-Pesa";
  if (channel === "bank" || channel === "bank_transfer") return "Bank transfer";
  return "Other";
}
