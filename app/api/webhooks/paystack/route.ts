import { NextResponse } from "next/server";
import { settle, verifyPaystackWebhook } from "@/lib/paystack";
import { adminClient } from "@/lib/server-supabase";

/**
 * Paystack calls this when a payment finishes. Set it in Paystack: Settings > API Keys & Webhooks >
 * Webhook URL = https://<your app>/api/webhooks/paystack. The signature is checked, then the payment
 * is re-checked with Paystack before any money is added, so a fake call can't add money.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPaystackWebhook(raw, req.headers.get("x-paystack-signature"))) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const b = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
  const ref = b.data?.reference;
  if ((b.event === "charge.success" || b.event === "charge.failed") && ref?.startsWith("fv_")) {
    try { await settle(adminClient(), ref); } catch (e) { console.error(e); return NextResponse.json({ ok: false }, { status: 500 }); }
  }
  return NextResponse.json({ ok: true });
}
