import { NextResponse } from "next/server";
import { maplerad } from "@/lib/cards";
import { fail, load } from "@/lib/cards/route-helpers";

/** Full card number and CVV, only when the user taps "Show details". Never stored by Flowvault for real cards. */
export async function POST(_req: Request, { params }: { params: Promise<{ subId: string }> }) {
  const { subId } = await params;
  const r = await load(subId);
  if ("error" in r) return r.error;
  if (r.card.provider === "mock") {
    const { data, error } = await r.sb.rpc("fv_reveal_card", { p_subscription: subId }).maybeSingle<{ pan: string; cvv: string }>();
    if (error || !data) return NextResponse.json({ error: "Couldn't load card details" }, { status: 400 });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  }
  if (r.card.status !== "active" || !r.card.provider_ref) return NextResponse.json({ error: "This card isn't ready yet" }, { status: 409 });
  try { return NextResponse.json(await maplerad.reveal(r.card.provider_ref), { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return fail(e); }
}
