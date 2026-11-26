import "server-only";

/**
 * Moves the Naira that users paid in (sitting in Paystack) to Maplerad's NGN deposit account, once a day.
 * OFF unless AUTO_SWEEP=on. Needs a registered Paystack business with Transfers enabled and the
 * transfer OTP turned off (Paystack dashboard), and Maplerad's NGN account number + bank code.
 *
 * Env (Render > Environment):
 *   AUTO_SWEEP=on                       switch
 *   SWEEP_ACCOUNT_NUMBER=0123456789     Maplerad's NGN deposit account (Maplerad dashboard > Account details)
 *   SWEEP_BANK_CODE=058                 that bank's Paystack code (see https://api.paystack.co/bank)
 *   SWEEP_ACCOUNT_NAME=Krevox Global    optional, shown in Paystack
 *   SWEEP_KEEP_KOBO=0                   optional: Naira to leave in Paystack (kobo)
 *   CRON_SECRET=<long random text>      the daily caller must send it
 */
const BASE = process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";
const MIN_KOBO = 100000; // don't bother moving less than ₦1,000
const FEE_BUFFER_KOBO = 5000; // leave ₦50 for Paystack's transfer fee

async function ps<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method, cache: "no-store",
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || j.status === false) throw new Error(`Paystack ${path}: ${j.message ?? res.status}`);
  return j.data as T;
}

export const sweepOn = () => process.env.AUTO_SWEEP === "on";

export async function sweepOnce(now = new Date()) {
  if (!sweepOn()) return { done: false, why: "AUTO_SWEEP is off" };
  const acct = process.env.SWEEP_ACCOUNT_NUMBER, bank = process.env.SWEEP_BANK_CODE;
  if (!acct || !bank) return { done: false, why: "SWEEP_ACCOUNT_NUMBER or SWEEP_BANK_CODE is missing" };

  const balances = await ps<{ currency: string; balance: number }[]>("GET", "/balance");
  const ngn = balances.find((b) => b.currency === "NGN")?.balance ?? 0;
  const keep = Number(process.env.SWEEP_KEEP_KOBO || 0) || 0;
  const amount = Math.floor(ngn - keep - FEE_BUFFER_KOBO);
  if (amount < MIN_KOBO) return { done: false, why: `Only ₦${(ngn / 100).toLocaleString("en-NG")} in Paystack, nothing to move` };

  // Paystack returns the existing recipient if this account was added before.
  const rcp = await ps<{ recipient_code: string }>("POST", "/transferrecipient", {
    type: "nuban", name: process.env.SWEEP_ACCOUNT_NAME || "Maplerad NGN wallet", account_number: acct, bank_code: bank, currency: "NGN",
  });
  // One sweep per day at most: Paystack refuses a reference it has seen before.
  const reference = `fvsweep-${now.toISOString().slice(0, 10)}`;
  const t = await ps<{ status: string; transfer_code: string }>("POST", "/transfer", {
    source: "balance", amount, recipient: rcp.recipient_code, reference, reason: "Flowvault top-ups to Maplerad", currency: "NGN",
  });
  return { done: true, amountKobo: amount, reference, status: t.status };
}
