import { NextResponse } from "next/server";
import { maplerad } from "@/lib/cards";
import { fail, load } from "@/lib/cards/route-helpers";

/** Switch a subscription on or off. Off = its card is frozen at the card company, so charges are declined. */
export async function POST(req: Request, { params }: { params: Promise<{ subId: string }> }) {
  const { subId } = await params;
  const { on } = (await req.json().catch(() => ({}))) as { on?: boolean };
  if (typeof on !== "boolean") return NextResponse.json({ error: "Missing on/off" }, { status: 400 });
  const r = await load(subId);
  if ("error" in r) return r.error;

  // Real card: freeze/unfreeze at the provider first, so the app never says "off" while the card still works.
  if (r.card.provider === "maplerad" && r.card.status === "active" && r.card.provider_ref) {
    try { await (on ? maplerad.unfreeze(r.card.provider_ref) : maplerad.freeze(r.card.provider_ref)); }
    catch (e) { return fail(e); }
  }
  const { error } = await r.sb.rpc("fv_update_subscription", { p_id: subId, p_is_on: on });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
