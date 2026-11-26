"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { Info } from "@/components/icons";

/** Paystack sends the user back here after paying. We check the payment with Paystack before adding money. */
export default function TopupReturn() {
  return <Suspense fallback={<div className="loading">Loading…</div>}><Result /></Suspense>;
}

function Result() {
  const sp = useSearchParams();
  const ref = sp.get("reference") ?? sp.get("trxref") ?? "";
  const { reload } = useStore();
  const [status, setStatus] = useState<"checking" | "paid" | "failed" | "pending">("checking");
  useEffect(() => {
    let n = 0, stop = false;
    const check = async () => {
      const r = await fetch("/api/topup", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: ref }) })
        .then((x) => x.json()).catch(() => ({ status: "pending" }));
      if (stop) return;
      if (r.status === "paid") { setStatus("paid"); reload(); return; }
      if (r.status === "failed" || r.status === "unknown") { setStatus("failed"); return; }
      // Bank transfers can take a minute to land. Keep checking for about 2 minutes.
      if (++n < 24) setTimeout(check, 5000); else setStatus("pending");
    };
    if (ref) check(); else setStatus("failed");
    return () => { stop = true; };
  }, [ref, reload]);

  return (
    <section className="screen">
      <div className="topbar"><h2>Add money</h2></div>
      {status === "checking" && <div className="callout"><Info /><span>Checking your payment with Paystack…</span></div>}
      {status === "paid" && <div className="callout"><Info /><span><b>Money added.</b> Your wallet has been topped up.</span></div>}
      {status === "failed" && <div className="error" role="alert">This payment didn&apos;t go through, so no money was taken. Please try again.</div>}
      {status === "pending" && <div className="callout warn"><Info /><span>Your payment is still on its way. Bank transfers can take a few minutes. Your wallet updates by itself once it lands.</span></div>}
      <Link className="btn primary block" href="/home">Back to home</Link>
    </section>
  );
}
