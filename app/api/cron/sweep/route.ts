import { NextResponse } from "next/server";
import crypto from "crypto";
import { sweepOnce } from "@/lib/sweep";

/**
 * Called once a day by a scheduler (Render Cron Job or cron-job.org) with
 * header "Authorization: Bearer <CRON_SECRET>". Moves Paystack's Naira balance to Maplerad.
 * Does nothing unless AUTO_SWEEP=on.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const ok = secret.length >= 16 && got.length === secret.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "not allowed" }, { status: 401 });
  try {
    const r = await sweepOnce();
    console.log("sweep:", JSON.stringify(r));
    return NextResponse.json(r);
  } catch (e) {
    console.error("sweep failed:", e);
    return NextResponse.json({ done: false, why: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}
