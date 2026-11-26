"use client";
import { useEffect, useState } from "react";
import { Badge, Sheet } from "./ui";
import { brandFor } from "@/lib/brands";
import { Warn } from "./icons";
import { useStore } from "./store";
import { COLORS, money, naira, nextCharge, shortDate } from "@/lib/format";
import type { Sub } from "@/lib/supabase";
import { cardsApi } from "@/lib/cards-client";
import { useRouter } from "next/navigation";

export function TopUpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { act, toast } = useStore();
  const [amt, setAmt] = useState(2000000);
  const [busy, setBusy] = useState(false);
  const go = async (method: "bank" | "card") => {
    setBusy(true);
    const r = await act("mock_top_up", { p_amount_kobo: amt, p_method: method });
    setBusy(false);
    if (r !== undefined) { onClose(); toast(`${naira(amt)} added to your wallet`); }
  };
  return (
    <Sheet open={open} onClose={onClose} label="Add money">
      <h2 style={{ fontSize: 22 }}>Add money</h2>
      <div className="bigAmt num">{naira(amt)}</div>
      <div className="chips">
        {[500000, 1000000, 2000000, 3000000, 5000000, 10000000].map((v) => (
          <button key={v} aria-pressed={v === amt} onClick={() => setAmt(v)}>{naira(v)}</button>
        ))}
      </div>
      <div className="callout warn"><Warn /><span><b>Test mode.</b> No real money moves yet. Tapping below adds pretend money so you can try the app. Real bank transfer and debit card top-ups come once a payment provider is connected.</span></div>
      <div className="callout warn"><Warn /><span>Top-ups are final. Flowvault money pays subscriptions only and can't be withdrawn.</span></div>
      <button className="btn tint block" disabled={busy} onClick={() => go("bank")}>Add {naira(amt)} by bank transfer</button>
      <button className="btn ghost block" disabled={busy} onClick={() => go("card")}>Pay with debit card instead</button>
    </Sheet>
  );
}

export function TurnOffSheet({ sub, onClose }: { sub: Sub | null; onClose: () => void }) {
  const { run, toast } = useStore();
  if (!sub) return null;
  const off = async () => {
    const r = await run(() => cardsApi.power(sub.id, false));
    if (r !== undefined) { onClose(); toast(`${sub.name} is off. Its card is frozen.`); }
  };
  return (
    <Sheet open onClose={onClose} label={`Turn off ${sub.name}`}>
      <h2 style={{ fontSize: 22 }}>Turn off {sub.name}?</h2>
      <p className="sub">Flowvault will freeze {sub.name}&apos;s card, so its next charge of <b className="num">{money(sub.price_minor, sub.currency)}</b> on {shortDate(nextCharge(sub.billing_day, sub.created_at))} is declined. You can switch it back on any time before then.</p>
      <button className="btn danger block" onClick={off}>Turn off {sub.name}</button>
      <button className="btn ghost block" onClick={onClose}>Keep it on</button>
    </Sheet>
  );
}

export function AddSubSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { act, toast, subs, profile, provider, balance, cardFee } = useStore();
  const router = useRouter();
  const fee = profile?.verified || provider !== "mock" ? cardFee : 0; // test cards are free
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [typed, setTyped] = useState("");
  const [preview, setPreview] = useState(""); // logo lookup waits until you stop typing
  useEffect(() => { const t = setTimeout(() => setPreview(typed.trim()), 450); return () => clearTimeout(t); }, [typed]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    const currency = String(f.get("currency")) as "NGN" | "USD";
    const price = Number(String(f.get("price")).replace(/[^\d.]/g, ""));
    const day = Number(f.get("day"));
    if (!name || !(price > 0)) return setErr("Enter a name and a price.");
    if (fee > balance) return setErr(`Insufficient balance. A new card costs ${naira(fee)} and your wallet has ${naira(balance)}. Add money first.`);
    setBusy(true); setErr("");
    const r = await act<string>("add_subscription", {
      p_name: name, p_plan: String(f.get("plan")), p_currency: currency,
      p_price_minor: Math.round(price * 100), p_billing_day: day, p_color: brandFor(name).color ?? COLORS[subs.length % COLORS.length],
    });
    if (r) await cardsApi.issue(r).catch((e) => toast(e.message)); // real cards only (takes the fee); does nothing for test cards
    setBusy(false);
    if (r) { setTyped(""); onClose(); toast(`${name} added with its own card`); router.push(`/subs/${r}?new=1`); }
  }
  return (
    <Sheet open={open} onClose={onClose} label="Add a subscription">
      <h2 style={{ fontSize: 22 }}>Add a subscription</h2>
      <p className="sub">We&apos;ll make a card just for this service. You put that card&apos;s number in your account with them.</p>
      <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <div className="field"><label htmlFor="s-name">Service</label>
          <div className="row" style={{ gap: 10 }}>
            <Badge key={preview} name={preview || "?"} color={brandFor(preview).color ?? "#8a8a82"} />
            <input id="s-name" name="name" placeholder="e.g. Netflix" required maxLength={60} value={typed} onChange={(e) => setTyped(e.target.value)} style={{ flex: 1 }} />
          </div><span className="hint">We find the company&apos;s logo automatically.</span></div>
        <div className="field"><label htmlFor="s-plan">Plan (optional)</label><input id="s-plan" name="plan" placeholder="e.g. Standard" /></div>
        <div className="two">
          <div className="field"><label htmlFor="s-cur">Billed in</label><select id="s-cur" name="currency" defaultValue="NGN"><option value="NGN">Naira (₦)</option><option value="USD">Dollars ($)</option></select></div>
          <div className="field"><label htmlFor="s-price">Monthly price</label><input id="s-price" name="price" inputMode="decimal" placeholder="5500" required /></div>
        </div>
        <div className="field"><label htmlFor="s-day">Charged on day</label>
          <select id="s-day" name="day" defaultValue={new Date().getDate() > 28 ? 28 : new Date().getDate()}>
            {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select><span className="hint">Day of the month the service bills you.</span></div>
        {fee > 0 && <span className="hint">Making the card costs {naira(fee)}, taken from your wallet. You get it back if the card can&apos;t be made.</span>}
        {err && <div className="error" role="alert">{err}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? "Making your card…" : "Add and make its card"}</button>
      </form>
    </Sheet>
  );
}
