"use client";
import Link from "next/link";
import { useState } from "react";
import { monthlyKobo, useStore } from "@/components/store";
import { AddSubSheet, TurnOffSheet } from "@/components/sheets";
import { Badge, Switch } from "@/components/ui";
import { cardsApi } from "@/lib/cards-client";
import { Plus } from "@/components/icons";
import { money, naira, nextCharge, shortDate } from "@/lib/format";
import type { Sub } from "@/lib/supabase";

export default function Subs() {
  const { ready, subs, usdRate, run, toast } = useStore();
  const [filter, setFilter] = useState<"all" | "on" | "off">("all");
  const [adding, setAdding] = useState(false);
  const [offing, setOffing] = useState<Sub | null>(null);
  if (!ready) return <div className="loading">Loading…</div>;

  const on = subs.filter((s) => s.is_on);
  const list = subs.filter((s) => filter === "all" || (filter === "on") === s.is_on);
  const toggle = async (s: Sub) => {
    if (s.is_on) return setOffing(s);
    const r = await run(() => cardsApi.power(s.id, true));
    if (r !== undefined) toast(`${s.name} is back on. Its card is unfrozen.`);
  };

  return (
    <section className="screen">
      <div className="topbar"><h2>Subscriptions</h2><button className="icon-btn" aria-label="Add subscription" onClick={() => setAdding(true)}><Plus /></button></div>
      <div className="stat">
        <div><span>Active</span><b className="num">{on.length} of {subs.length}</b></div>
        <div><span>Per month</span><b className="num">{naira(on.reduce((a, s) => a + monthlyKobo(s, usdRate), 0))}</b></div>
      </div>
      <div className="seg" role="group" aria-label="Filter">
        {(["all", "on", "off"] as const).map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "on" ? "On" : "Off"}</button>
        ))}
      </div>
      <div className="panel list">
        {list.length ? list.map((s) => (
          <div className="item" key={s.id}>
            <Link className="item" style={{ padding: 0, border: 0, flex: 1, minWidth: 0 }} href={`/subs/${s.id}`}>
              <Badge name={s.name} color={s.color} dim={!s.is_on} />
              <span className="meta"><span className="name">{s.name}</span>
                <span className="small num">{money(s.price_minor, s.currency)} · {s.is_on ? "next " + shortDate(nextCharge(s.billing_day)) : "off"}</span></span>
            </Link>
            <Switch on={s.is_on} label={`${s.name} on`} onChange={() => toggle(s)} />
          </div>
        )) : (
          <div className="empty">{subs.length ? "Nothing here." : <>No subscriptions yet.<br /><button className="btn link" onClick={() => setAdding(true)}>Add your first one</button></>}</div>
        )}
      </div>
      <p className="sub small" style={{ textAlign: "center" }}>Each subscription has its own card. Turning one off freezes that card, so its next charge is declined. You keep access until the current period ends.</p>
      <AddSubSheet open={adding} onClose={() => setAdding(false)} />
      <TurnOffSheet sub={offing} onClose={() => setOffing(null)} />
    </section>
  );
}
