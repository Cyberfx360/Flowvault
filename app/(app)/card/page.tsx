"use client";
import { useState } from "react";
import { useStore } from "@/components/store";
import { Switch } from "@/components/ui";
import { Copy, Eye, Info } from "@/components/icons";
import { supabase } from "@/lib/supabase";

const group = (pan: string) => pan.replace(/(\d{4})(?=\d)/g, "$1 ");

export default function CardPage() {
  const { ready, card, act, toast } = useStore();
  const [shown, setShown] = useState<{ pan: string; cvv: string } | null>(null);
  if (!ready || !card) return <div className="loading">Loading…</div>;

  async function fetchDetails() {
    const { data, error } = await supabase.rpc("fv_reveal_card").single<{ pan: string; cvv: string }>();
    if (error || !data) { toast("Couldn't load card details"); return null; }
    return data;
  }
  async function reveal() {
    if (shown) return setShown(null);
    setShown(await fetchDetails());
  }
  async function copy() {
    const d = shown ?? (await fetchDetails());
    if (!d) return;
    try { await navigator.clipboard.writeText(d.pan); toast("Card number copied"); } catch { toast("Couldn't copy. Tap Show details instead."); }
  }
  async function freeze() {
    const v = !card!.frozen;
    const r = await act("update_card", { p_frozen: v });
    if (r !== undefined) toast(v ? "Card frozen. All charges will be declined." : "Card unfrozen");
  }

  const exp = `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`;
  return (
    <section className="screen">
      <div className="topbar"><h2>Card</h2><span className={"pill " + (card.frozen ? "warn" : "ok")}>{card.frozen ? "Frozen" : "Active"}</span></div>
      <div className={"vcard" + (card.frozen ? " frozen" : "")}>
        <div className="row between"><span className="brand">Flowvault</span><span className="chip" /></div>
        <div className="pan">{shown ? group(shown.pan) : `•••• •••• •••• ${card.last4}`}</div>
        <div className="row between">
          <div><div className="lbl">Card holder</div><div className="val">{card.holder_name}</div></div>
          <div><div className="lbl">Expires</div><div className="val">{exp}</div></div>
          <div><div className="lbl">CVV</div><div className="val">{shown ? shown.cvv : "•••"}</div></div>
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={reveal}><Eye />{shown ? "Hide details" : "Show details"}</button>
        <button className="btn ghost" style={{ flex: 1 }} onClick={copy}><Copy />Copy number</button>
      </div>
      <div className="panel list">
        <div className="row between"><div><div style={{ fontWeight: 500 }}>Freeze card</div><div className="sub small">Blocks every charge until you unfreeze</div></div><Switch on={card.frozen} label="Freeze card" onChange={freeze} /></div>
        <div className="row between"><div><div style={{ fontWeight: 500 }}>Only my subscriptions</div><div className="sub small">Services not on your list are always declined</div></div><span className="pill ok">Always on</span></div>
        <div className="row between"><span>Card network</span><span className="sub small">{card.network} · USD &amp; NGN</span></div>
      </div>
      <div className="callout"><Info /><span>This is a test card and can&apos;t pay real services yet. Dollar-priced services will be converted from your Naira balance at the rate shown before each charge.</span></div>
    </section>
  );
}
