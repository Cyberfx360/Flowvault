"use client";
import Link from "next/link";
import { useState } from "react";
import { monthlyKobo, useStore } from "@/components/store";
import { TopUpSheet } from "@/components/sheets";
import { Badge } from "@/components/ui";
import { Chevron, Plus } from "@/components/icons";
import { money, naira, nextCharge, shortDate } from "@/lib/format";
import { Logo } from "@/components/logo";

export default function Home() {
  const { ready, profile, balance, subs, cards, usdRate } = useStore();
  const [topup, setTopup] = useState(false);
  if (!ready) return <div className="loading">Loading…</div>;

  const on = subs.filter((s) => s.is_on);
  const monthly = on.reduce((a, s) => a + monthlyKobo(s, usdRate), 0);
  const months = monthly ? balance / monthly : 0;
  const upcoming = [...on].sort((a, b) => +nextCharge(a.billing_day, a.created_at) - +nextCharge(b.billing_day, b.created_at)).slice(0, 3);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <section className="screen">
      <div className="topbar">
        <div className="row"><Logo size={40} /><div><p className="sub small">{hello}</p><h2 style={{ fontSize: 22 }}>{profile?.full_name.split(" ")[0] || "there"}</h2></div></div>
        <Link className="avatar" href="/profile" aria-label="Profile">{(profile?.full_name ?? "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"}</Link>
      </div>

      <div className="balance">
        <div className="stack" style={{ gap: 6 }}><h3>Wallet balance</h3>
          <div className="fig num">{naira(balance)}<small>.{String(balance % 100).padStart(2, "0")}</small></div></div>
        {monthly > 0 ? (
          <div className="stack" style={{ gap: 6 }}>
            <div className={"meter" + (months < 1 ? " low" : "")}><i style={{ width: Math.min(100, (months / 2) * 100) + "%" }} /></div>
            <div className="row between small"><span className="sub">{months >= 1 ? `Covers ${months.toFixed(1)} months of subscriptions` : "Not enough for this month"}</span><span className="sub num">{naira(monthly)}/mo</span></div>
          </div>
        ) : <p className="sub small">Add your subscriptions to see how long your balance lasts.</p>}
        <button className="btn tint block" onClick={() => setTopup(true)}><Plus />Add money</button>
      </div>

      <div className="stack">
        <div className="row between"><h3>Coming up</h3><Link className="btn link" href="/subs">See all</Link></div>
        <div className="panel list">
          {upcoming.length ? upcoming.map((s) => (
            <Link key={s.id} className="item" href={`/subs/${s.id}`}>
              <Badge name={s.name} color={s.color} />
              <span className="meta"><span className="name">{s.name}</span><span className="small">{shortDate(nextCharge(s.billing_day, s.created_at))}</span></span>
              <span className="amt num">{money(s.price_minor, s.currency)}</span>
            </Link>
          )) : <Link href="/subs" className="empty">No subscriptions yet. Add your first one.</Link>}
        </div>
      </div>

      <Link className="panel row" style={{ padding: "14px 16px" }} href="/card">
        <div className="minicard"><b>Fv</b><span>×{cards.length}</span></div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>Your cards</div><div className="sub small">{cards.length ? `${cards.filter((c) => !c.frozen).length} active, one per subscription` : "Each subscription gets its own card"}</div></div>
        <Chevron />
      </Link>

      <TopUpSheet open={topup} onClose={() => setTopup(false)} />
    </section>
  );
}
