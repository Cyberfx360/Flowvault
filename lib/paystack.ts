import "server-only";
import crypto from "crypto";

/**
 * Paystack (https://paystack.com/docs/api). SERVER ONLY: the secret key never reaches the browser.
 * Test keys start with sk_test_, live keys with sk_live_. Amounts are in kobo.
 */
const BASE = process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";
const key = () => process.env.PAYSTACK_SECRET_KEY?.trim() || "";

export const paystackReady = () => key().startsWith("sk_");
export const paystackLive = () => key().startsWith("sk_live_");

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || json.status === false) throw new Error(`Paystack: ${json.message ?? res.status}`);
  return json.data as T;
}

/** Starts a payment. Returns the Paystack page to send the user to. */
export async function startPayment(p: { email: string; amountKobo: number; reference: string; channel: "card" | "bank_transfer"; callbackUrl: string; userId: string }) {
  const d = await call<{ authorization_url: string }>("POST", "/transaction/initialize", {
    email: p.email, amount: p.amountKobo, currency: "NGN", reference: p.reference,
    channels: [p.channel], callback_url: p.callbackUrl, metadata: { user_id: p.userId, app: "flowvault" },
  });
  return d.authorization_url;
}

/** Asks Paystack how a payment went. Never trust the browser or the webhook body alone. */
export async function checkPayment(reference: string) {
  const d = await call<{ status: string; amount: number; currency: string; reference: string }>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
  return { paid: d.status === "success" && d.currency === "NGN", failed: ["failed", "abandoned", "reversed"].includes(d.status), amountKobo: d.amount };
}

/** Webhooks are signed: HMAC-SHA512 of the raw body with the secret key, in x-paystack-signature. */
export function verifyPaystackWebhook(rawBody: string, signature: string | null) {
  if (!signature || !paystackReady()) return false;
  const expected = crypto.createHmac("sha512", key()).update(rawBody).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Checks the payment with Paystack and credits the wallet once. Used by the webhook and the return page. */
export async function settle(admin: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> }, reference: string) {
  const r = await checkPayment(reference);
  if (r.paid) {
    const { data, error } = await admin.rpc("fv_server_topup_paid", { p_reference: reference, p_paid_kobo: r.amountKobo, p_live: paystackLive() });
    if (error) throw error;
    return data === "unknown" ? "unknown" : "paid";
  }
  if (r.failed) { await admin.rpc("fv_server_topup_failed", { p_reference: reference }); return "failed"; }
  return "pending";
}
