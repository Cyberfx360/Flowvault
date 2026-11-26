"use client";
import { useState } from "react";
import { useStore } from "@/components/store";
import { Badge } from "@/components/ui";
import { dayLabel, txnAmount } from "@/lib/format";

export default function History() {
  const { ready, txns, subs, usdRate } = useStore();
  const [f, setF] = useState<"all" | "in" | "out">("all");
  if (!ready) return <div className="loading">Loading…</div>;

  const list = txns.filter((t) => f === "all" || (f === "in" ? t.kind === "topup" : t.kind === "charge"));
  const groups: { day: string; items: typeof list }[] = [];
  for (const t of list) {
    const day = dayLabel(t.created_at);
    if (groups.at(-1)?.day !== day) groups.push({ day, items: [] });
    groups.at(-1)!.items.push(t);
  }

  return (
    <section className="screen">
      <div className="topbar"><h2>History</h2></div>
      <div className="seg" role="group" aria-label="Filter">
        {([["all", "All"], ["in", "Money in"], ["out", "Payments"]] as const).map(([k, l]) => (
          <button key={k} aria-pressed={f === k} onClick={() => setF(k)}>{l}</button>
        ))}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {groups.length ? groups.map((g) => (
          <div key={g.day} className="stack" style={{ gap: 8 }}>
            <div className="dayhead">{g.day}</div>
            <div className="panel list">
              {g.items.map((t) => {
                const sub = subs.find((s) => s.id === t.subscription_id);
                const declined = t.status === "declined";
                return (
                  <div className="item" key={t.id}>
                    {t.kind === "topup"
                      ? <span className="badge" style={{ background: "var(--success-soft)", color: "var(--success)" }}>↓</span>
                      : <Badge name={t.title} color={sub?.color ?? "#565a55"} />}
                    <span className="meta"><span className="name">{t.title}</span><span className="small">{t.detail.replace(/^\$[\d.]+ · /, "")}</span></span>
                    <span className="amt num" style={{ color: t.kind === "topup" ? "var(--success)" : declined ? "var(--ink-subtle)" : "var(--ink)" }}>
                      {declined ? "₦0" : (t.kind === "topup" ? "+" : "−") + txnAmount(t, usdRate)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )) : <div className="panel empty">Nothing yet. Add money or a subscription to get started.</div>}
      </div>
    </section>
  );
}
