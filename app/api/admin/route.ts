import { NextResponse } from "next/server";
import { adminUser } from "@/lib/admin";
import { adminClient } from "@/lib/server-supabase";
import { mapleradReady, moveToSpend, walletList } from "@/lib/cards/maplerad";
import { paystackBalanceKobo, paystackLive, paystackReady } from "@/lib/paystack";
import { sweepOn, sweepOnce } from "@/lib/sweep";

export const dynamic = "force-dynamic";
const nope = () => NextResponse.json({ error: "not found" }, { status: 404 });
const msg = (e: unknown) => (e instanceof Error ? e.message : "failed").slice(0, 300);

/** Everything the admin page shows. Each part fails on its own, so one broken service doesn't blank the page. */
export async function GET() {
  if (!(await adminUser())) return nope();
  const [stats, maple, paystack] = await Promise.allSettled([
    adminClient().rpc("fv_server_admin_stats").then((r) => { if (r.error) throw new Error(r.error.message); return r.data; }),
    mapleradReady() ? walletList() : Promise.reject(new Error("MAPLERAD_SECRET_KEY is not set")),
    paystackReady() ? paystackBalanceKobo() : Promise.reject(new Error("PAYSTACK_SECRET_KEY is not set")),
  ]);
  return NextResponse.json({
    stats: stats.status === "fulfilled" ? stats.value : null, statsError: stats.status === "rejected" ? msg(stats.reason) : null,
    wallets: maple.status === "fulfilled" ? maple.value : null, walletsError: maple.status === "rejected" ? msg(maple.reason) : null,
    paystackKobo: paystack.status === "fulfilled" ? paystack.value : null, paystackError: paystack.status === "rejected" ? msg(paystack.reason) : null,
    paystackLive: paystackLive(),
    sweep: { on: sweepOn(), account: !!process.env.SWEEP_ACCOUNT_NUMBER && !!process.env.SWEEP_BANK_CODE },
  });
}

/** Buttons: { action: "move_to_spend", cents } or { action: "sweep" }. */
export async function POST(req: Request) {
  const who = await adminUser();
  if (!who) return nope();
  const b = (await req.json().catch(() => ({}))) as { action?: string; cents?: number };
  try {
    if (b.action === "move_to_spend") {
      const cents = Number(b.cents);
      await moveToSpend(cents);
      console.log("admin move_to_spend", cents, "by", who.id);
      return NextResponse.json({ ok: true, message: `Moved $${(cents / 100).toFixed(2)} to Spend` });
    }
    if (b.action === "sweep") {
      const r = await sweepOnce();
      console.log("admin sweep", JSON.stringify(r), "by", who.id);
      const done = r.done && "amountKobo" in r;
      return NextResponse.json({ ok: r.done, message: done ? `Sent ₦${(Number(r.amountKobo) / 100).toLocaleString("en-NG")} to Maplerad (${r.status})` : ("why" in r ? r.why : "Nothing moved") });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    const m = msg(e);
    if (/duplicate/i.test(m)) return NextResponse.json({ ok: false, message: "Already sent once today. It can run again tomorrow." });
    return NextResponse.json({ ok: false, message: m }, { status: 502 });
  }
}
