import { NextResponse } from "next/server";
import { maplerad } from "@/lib/cards";
import { fail, load } from "@/lib/cards/route-helpers";

/** Remove a subscription. Its card is ended at the card company first. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ subId: string }> }) {
  const { subId } = await params;
  const r = await load(subId);
  if ("error" in r) return r.error;
  if (r.card.provider === "maplerad" && r.card.provider_ref && r.card.status === "active") {
    try { await maplerad.terminate(r.card.provider_ref); } catch (e) { return fail(e); }
  }
  const { error } = await r.sb.rpc("fv_delete_subscription", { p_id: subId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
