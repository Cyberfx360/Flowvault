import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/cards/maplerad";
import { adminClient } from "@/lib/server-supabase";

/**
 * Maplerad calls this when a card is created and when a charge happens.
 * Set the webhook URL in the Maplerad dashboard to https://<your-site>/api/webhooks/maplerad.
 *
 * DRAFT until tested in the Maplerad sandbox: field names follow the docs' examples (Nov 2026).
 */
type Body = {
  event?: string; eventType?: string; reference?: string;
  payload?: { reference?: string };
  card?: { id: string; masked_pan?: string; issuer?: string };
  card_id?: string; type?: string; mode?: string; status?: string;
  authorization_amount?: number; authorization_currency?: string; amount?: number; currency?: string;
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(req.headers, raw)) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const b = JSON.parse(raw) as Body;
  const event = b.event ?? b.eventType;
  const admin = adminClient();

  if (event === "issuing.created.successful" && b.card && b.reference) {
    const last4 = (b.card.masked_pan ?? "").slice(-4);
    const network = b.card.issuer === "MASTERCARD" ? "Mastercard" : "Visa";
    await admin.rpc("fv_server_attach_card", { p_reference: b.reference, p_card_id: b.card.id, p_last4: last4, p_network: network });
  } else if (event === "issuing.created.failed") {
    const ref = b.reference ?? b.payload?.reference;
    if (ref) await admin.rpc("fv_server_card_failed", { p_reference: ref });
  } else if (event === "issuing.transaction" && b.card_id && b.mode === "DEBIT" && b.type === "AUTHORIZATION") {
    // Record the charge on the user's wallet ledger. (Declines on frozen cards happen at Maplerad;
    // showing those in History is a follow-up once we've seen real DECLINE payloads.)
    // VERIFY in sandbox: amount units (cents?) and status values.
    const amount = b.authorization_amount ?? b.amount ?? 0;
    const currency = (b.authorization_currency ?? b.currency ?? "USD").toUpperCase() === "NGN" ? "NGN" : "USD";
    await admin.rpc("fv_server_card_charge", { p_card_ref: b.card_id, p_amount_minor: amount, p_currency: currency });
  }
  return NextResponse.json({ ok: true });
}
