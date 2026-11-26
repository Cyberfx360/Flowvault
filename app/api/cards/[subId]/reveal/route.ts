import { NextResponse } from "next/server";
import { maplerad } from "@/lib/cards";
import { fail, load } from "@/lib/cards/route-helpers";
import { networkFromPan } from "@/lib/cards/network";
import { adminClient } from "@/lib/server-supabase";

/** Full card number and CVV, only when the user taps "Show details". Never stored by Flowvault for real cards. */
export async function POST(_req: Request, { params }: { params: Promise<{ subId: string }> }) {
  const { subId } = await params;
  const r = await load(subId);
  if ("error" in r) return r.error;
  if (r.card.provider === "mock") {
    const { data, error } = await r.sb.rpc("fv_reveal_card", { p_subscription: subId }).maybeSingle<{ pan: string; cvv: string }>();
    if (error || !data) return NextResponse.json({ error: "Couldn't load card details" }, { status: 400 });
    // Test cards get a pretend address so the screen looks the same as a real card's.
    const address = { street: "1 Test Street", city: "San Francisco", state: "CA", postal_code: "94105", country: "US" };
    return NextResponse.json({ ...data, address, test: true }, { headers: { "Cache-Control": "no-store" } });
  }
  if (r.card.status !== "active" || !r.card.provider_ref) return NextResponse.json({ error: "This card isn't ready yet" }, { status: 409 });
  try {
    const d = await maplerad.reveal(r.card.provider_ref);
    // If the stored Visa/Mastercard doesn't match the real number, fix it so the card face is right next time.
    const net = networkFromPan(d.pan);
    if (net) await adminClient().rpc("fv_server_fix_card_network", { p_subscription: subId, p_network: net });
    return NextResponse.json(d, { headers: { "Cache-Control": "no-store" } });
  }
  catch (e) { return fail(e); }
}
