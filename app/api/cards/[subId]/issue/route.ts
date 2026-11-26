import { NextResponse } from "next/server";
import { maplerad } from "@/lib/cards";
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
  try {
    const reference = await maplerad.requestCard(cust.customer_id);
    const { error } = await admin.rpc("fv_server_card_requested", { p_subscription: subId, p_reference: reference });
    if (error) throw error;
    return NextResponse.json({ ok: true, pending: true });
  } catch (e) {
    console.error(e);
    const msg = (e as { providerMessage?: string }).providerMessage;
    await admin.rpc("fv_server_card_request_failed", { p_subscription: subId, p_error: msg || (e instanceof Error ? e.message : "No reply") });
    return NextResponse.json({ error: msg ? `Card not made. Maplerad said: ${msg}` : "The card company didn't respond. Please try again." }, { status: 502 });
  }
}
