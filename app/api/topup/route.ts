import { NextResponse } from "next/server";
import crypto from "crypto";
import { paystackReady, settle, startPayment } from "@/lib/paystack";
import { adminClient, userClient } from "@/lib/server-supabase";

/** Is real money (Paystack) switched on? Without it the app keeps its pretend top-ups. */
export async function GET() {
  return NextResponse.json({ available: paystackReady() });
}

/** Starts a top-up: records it, then returns Paystack's payment page for the browser to open. */
export async function POST(req: Request) {
  const sb = await userClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  if (!paystackReady()) return NextResponse.json({ error: "Card and bank payments aren't switched on yet" }, { status: 409 });
  const b = (await req.json().catch(() => ({}))) as { amountKobo?: number; channel?: string };
  const amountKobo = Math.round(Number(b.amountKobo));
  const channel = b.channel === "card" ? "card" : "bank_transfer";
  if (!(amountKobo >= 10000 && amountKobo <= 100000000)) return NextResponse.json({ error: "Top-ups must be between ₦100 and ₦1,000,000" }, { status: 400 });

  const reference = "fv_" + crypto.randomUUID().replace(/-/g, "");
  const admin = adminClient();
  const { error } = await admin.rpc("fv_server_topup_create", { p_user: user.id, p_reference: reference, p_amount_kobo: amountKobo, p_channel: channel });
  if (error) { console.error(error); return NextResponse.json({ error: "Couldn't start the payment" }, { status: 500 }); }
  try {
    // Where Paystack sends the user back. Render sits behind a proxy, so use the forwarded host.
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
    const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("127.0.0.1") || host.startsWith("localhost") ? "http" : "https");
    const url = await startPayment({ email: user.email, amountKobo, reference, channel, callbackUrl: `${process.env.APP_URL || `${proto}://${host}`}/topup`, userId: user.id });
    return NextResponse.json({ url, reference });
  } catch (e) {
    console.error(e);
    await admin.rpc("fv_server_topup_failed", { p_reference: reference });
    return NextResponse.json({ error: "Paystack didn't respond. Please try again." }, { status: 502 });
  }
}

/** The return page asks this after Paystack sends the user back: checks with Paystack, credits once. */
export async function PUT(req: Request) {
  const sb = await userClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  const { reference } = (await req.json().catch(() => ({}))) as { reference?: string };
  if (!reference || !/^fv_[a-f0-9]{32}$/.test(reference)) return NextResponse.json({ error: "Unknown payment" }, { status: 400 });
  try { return NextResponse.json({ status: await settle(adminClient(), reference) }); }
  catch (e) { console.error(e); return NextResponse.json({ status: "pending" }); }
}
