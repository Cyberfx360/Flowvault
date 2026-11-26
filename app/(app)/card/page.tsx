"use client";
import Link from "next/link";
import { useState } from "react";
import { AddSubSheet } from "@/components/sheets";
import { useStore } from "@/components/store";
import { Badge } from "@/components/ui";
import { Chevron, Info, Plus } from "@/components/icons";
import { money } from "@/lib/format";

export default function CardsPage() {
  const { ready, subs, cardFor, provider, profile } = useStore();
  const [adding, setAdding] = useState(false);
  if (!ready) return <div className="loading">Loading…</div>;
  return (
    <section className="screen">
      <div className="topbar"><h2>Cards</h2><span className="pill ok">{subs.length} {subs.length === 1 ? "card" : "cards"}</span></div>
      <button className="btn primary block" onClick={() => setAdding(true)}><Plus />New card for a company</button>
      <p className="sub">Every subscription gets its own card. Give each company only its own card number. Switching a subscription off freezes its card, so that company can&apos;t charge you.</p>
      <div className="panel list">
        {subs.length ? subs.map((s) => {
          const c = cardFor(s.id);
          const frozen = !s.is_on || c?.frozen;
          const label = c?.status === "failed" ? "Not made" : c?.status === "pending" ? "Making" : frozen ? "Frozen" : "Active";
          return (
            <Link key={s.id} className="item" href={`/subs/${s.id}`}>
              <Badge name={s.name} color={s.color} dim={frozen} />
              <span className="meta"><span className="name">{s.name}</span>
                <span className="small num">{c?.provider === "mock" ? "Test · " : ""}{c?.status === "active" ? `${c.network} •• ${c.last4}` : c?.status === "failed" ? "Card failed" : "Card on its way"} · {money(s.price_minor, s.currency)}/mo</span></span>
              <span className={"pill " + (label === "Active" ? "ok" : label === "Not made" ? "bad" : "warn")}>{label}</span>
              <Chevron />
            </Link>
          );
        }) : <div className="empty">No cards yet. Tap <b>New card for a company</b> above.</div>}
      </div>
      <Link className="panel row" style={{ padding: "14px 16px" }} href="/verify">
        <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>{profile?.verified ? "ID verified" : "Get real cards"}</div>
          <div className="sub small">{profile?.verified ? "New subscriptions get real Visa cards" : "Verify your ID with your BVN"}</div></div>
        <Chevron />
      </Link>
      <div className="callout"><Info /><span>{provider === "mock" && !profile?.verified
        ? "Test cards: these numbers can't pay real services yet. Dollar-priced services are converted from your Naira balance at the rate shown before each charge."
        : "Cards are Visa dollar cards. Naira-priced services are paid in dollars and converted by your bank."}</span></div>
      <AddSubSheet open={adding} onClose={() => setAdding(false)} />
    </section>
  );
}
