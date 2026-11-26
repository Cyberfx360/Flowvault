"use client";
import Link from "next/link";
import { useStore } from "@/components/store";
import { Badge } from "@/components/ui";
import { Chevron, Info } from "@/components/icons";
import { money } from "@/lib/format";

export default function CardsPage() {
  const { ready, subs, cardFor, provider } = useStore();
  if (!ready) return <div className="loading">Loading…</div>;
  return (
    <section className="screen">
      <div className="topbar"><h2>Cards</h2><span className="pill ok">{subs.length} {subs.length === 1 ? "card" : "cards"}</span></div>
      <p className="sub">Every subscription gets its own card. Give each company only its own card number. Switching a subscription off freezes its card, so that company can&apos;t charge you.</p>
      <div className="panel list">
        {subs.length ? subs.map((s) => {
          const c = cardFor(s.id);
          const frozen = !s.is_on || c?.frozen;
          return (
            <Link key={s.id} className="item" href={`/subs/${s.id}`}>
              <Badge name={s.name} color={s.color} dim={frozen} />
              <span className="meta"><span className="name">{s.name}</span>
                <span className="small num">{c?.status === "active" ? `${c.network} •• ${c.last4}` : c?.status === "failed" ? "Card failed" : "Card on its way"} · {money(s.price_minor, s.currency)}/mo</span></span>
              <span className={"pill " + (frozen ? "warn" : "ok")}>{frozen ? "Frozen" : "Active"}</span>
              <Chevron />
            </Link>
          );
        }) : <Link href="/subs" className="empty">No cards yet. Add a subscription and its card is made for you.</Link>}
      </div>
      <div className="callout"><Info /><span>{provider === "mock"
        ? "Test cards: these numbers can't pay real services yet. Dollar-priced services are converted from your Naira balance at the rate shown before each charge."
        : "Cards are Visa dollar cards. Naira-priced services are paid in dollars and converted by your bank."}</span></div>
    </section>
  );
}
