import { NextResponse } from "next/server";
import { maplerad } from "@/lib/cards";
import { fail, load } from "@/lib/cards/route-helpers";
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
  if (r.card.provider_ref && r.card.status === "pending") return NextResponse.json({ ok: true, pending: true });

  const admin = adminClient();
  const { data: cust } = await admin.rpc("fv_server_customer", { p_user: r.user.id }).maybeSingle<{ customer_id: string | null }>();
  if (!cust?.customer_id) {
    // Maplerad needs ID checks (BVN, date of birth, address) before the first card. That screen isn't built yet.
    return NextResponse.json({ error: "Verify your identity first to get real cards" }, { status: 409 });
  }
  try {
    const reference = await maplerad.requestCard(cust.customer_id);
    const { error } = await admin.rpc("fv_server_card_requested", { p_subscription: subId, p_reference: reference });
    if (error) throw error;
    return NextResponse.json({ ok: true, pending: true });
  } catch (e) { return fail(e); }
}
