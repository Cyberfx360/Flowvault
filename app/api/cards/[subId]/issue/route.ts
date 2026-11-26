import { NextResponse } from "next/server";
import { maplerad, providerName } from "@/lib/cards";
import { CARD_SPEND_CENTS, ensureSpend, walletsSummary } from "@/lib/cards/maplerad";
import { load } from "@/lib/cards/route-helpers";
import { adminClient } from "@/lib/server-supabase";

/**
 * Asks the card company for this subscription's card (real providers only; mock cards exist already).
 * The card itself arrives a moment later through the webhook.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ subId: string }> }) {
  const { subId } = await params;
  const r = await load(subId);
  if ("error" in r) return r.error;
  if (r.card.provider === "mock" || r.card.status === "active") return NextResponse.json({ ok: true });
  const admin = adminClient();
  if (r.card.provider_ref && r.card.status === "pending") {
    // Already asked. If Maplerad has finished but its webhook hasn't reached us, pick the card up directly.
    try {
      const c = await maplerad.lookup(r.card.provider_ref);
      if (c) await admin.rpc("fv_server_attach_card", { p_reference: r.card.provider_ref, p_card_id: c.id, p_last4: c.last4, p_network: c.network });
    } catch (e) { console.error(e); }
    return NextResponse.json({ ok: true, pending: true });
  }

  const { data: cust } = await admin.rpc("fv_server_customer2", { p_user: r.user.id }).maybeSingle<{ customer_id: string | null; tier: number | null }>();
  if (!cust?.customer_id || (cust.tier ?? 1) < 2) {
    // Maplerad needs ID checks (BVN, date of birth, address) before the first card. That screen isn't built yet.
    return NextResponse.json({ error: "Finish your ID check first (Cards > Get real cards)" }, { status: 409 });
  }
  // The card fee comes out of the user's Flowvault wallet first. Not enough money: don't ask Maplerad.
  const { data: fee, error: feeErr } = await admin.rpc("fv_server_take_card_fee", { p_subscription: subId });
  if (feeErr) { console.error(feeErr); return NextResponse.json({ error: "Couldn't take the card fee. Please try again." }, { status: 500 }); }
  if (fee === "insufficient") return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
  try {
    // Cards are paid from the Spend wallet; top it up from Treasury first if it's short.
    const moved = await ensureSpend(CARD_SPEND_CENTS);
    if (moved) console.log("Moved " + moved + " cents from Treasury to Spend for a new card");
    const reference = await maplerad.requestCard(cust.customer_id);
    const { error } = await admin.rpc("fv_server_card_requested", { p_subscription: subId, p_reference: reference });
    if (error) throw error;
    return NextResponse.json({ ok: true, pending: true });
  } catch (e) {
    console.error(e);
    let msg = (e as { providerMessage?: string }).providerMessage;
    // While testing (CARD_PROVIDER not set to maplerad yet), show which Maplerad wallet this server's key sees.
    if (msg && /insufficient/i.test(msg) && providerName === "mock") {
      try { msg += ` (Maplerad wallets for the key on Render: ${await walletsSummary()})`; }
      catch (w) { msg += ` (couldn't read Maplerad wallets: ${(w as { providerMessage?: string }).providerMessage ?? "no reply"})`; }
    }
    await admin.rpc("fv_server_card_request_failed", { p_subscription: subId, p_error: msg || (e instanceof Error ? e.message : "No reply") });
    return NextResponse.json({ error: msg ? `Card not made. Maplerad said: ${msg}` : "The card company didn't respond. Please try again." }, { status: 502 });
  }
}
