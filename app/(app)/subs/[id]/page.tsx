"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { monthlyKobo, useStore } from "@/components/store";
import { TurnOffSheet } from "@/components/sheets";
import { Badge, Switch } from "@/components/ui";
import { SubCard } from "@/components/vcard";
import { cardsApi } from "@/lib/cards-client";
import { Back } from "@/components/icons";
import { money, naira, nextCharge, ordinal, shortDate, dayLabel } from "@/lib/format";

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, subs, txns, usdRate, cardFor, provider, act, run, toast } = useStore();
  const [offing, setOffing] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!ready) return <div className="loading">Loading…</div>;
  const s = subs.find((x) => x.id === id);
  if (!s) return <section className="screen"><p className="sub">This subscription doesn&apos;t exist any more.</p><Link className="btn ghost block" href="/subs">Back to subscriptions</Link></section>;

  const card = cardFor(s.id);
  const hist = txns.filter((t) => t.subscription_id === s.id);
  const year = new Date().getFullYear();
  const paidYear = hist.filter((t) => t.status === "success" && new Date(t.created_at).getFullYear() === year).reduce((a, t) => a + t.amount_kobo, 0);

  const set = (k: "p_price_guard" | "p_remind", v: boolean) => act("update_subscription", { p_id: s.id, [k]: v });
  const toggleOn = async () => {
    if (s.is_on) return setOffing(true);
    if ((await run(() => cardsApi.power(s.id, true))) !== undefined) toast(`${s.name} is back on. Its card is unfrozen.`);
  };
  const simulate = async () => {
    setBusy(true);
    const r = await act<string>("mock_charge", { p_subscription: s.id });
    setBusy(false);
    if (r) toast(r === "approved" ? `${s.name} charged ${money(s.price_minor, s.currency)}` : `Declined: ${r.toLowerCase()}`);
  };
  const remove = async () => {
    if ((await run(() => cardsApi.remove(s.id))) !== undefined) { toast(`${s.name} removed and its card ended`); router.replace("/subs"); }
  };

  return (
    <section className="screen">
      <div className="topbar"><Link className="icon-btn" href="/subs" aria-label="Back"><Back /></Link><span style={{ width: 44 }} /></div>
      <div className="detailHead">
        <Badge name={s.name} color={s.color} />
        <h2>{s.name}</h2>
        <span className="sub">{s.plan} · since {new Date(s.created_at).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}</span>
        <span className={"pill " + (s.is_on ? "ok" : "off")}>{s.is_on ? "On" : "Off"}</span>
      </div>
      <SubCard sub={s} card={card} />
      <p className="sub small" style={{ textAlign: "center" }}>This card is only for {s.name}. Enter its number in your {s.name} account.</p>
      <div className="stat">
        <div><span>Monthly price</span><b className="num">{money(s.price_minor, s.currency)}</b></div>
        <div><span>Next charge</span><b>{s.is_on ? shortDate(nextCharge(s.billing_day)) : "None"}</b></div>
        <div><span>Paid this year</span><b className="num">{naira(paidYear)}</b></div>
        <div><span>Card</span><b>{s.is_on ? "Active" : "Frozen"}</b></div>
      </div>
      {s.currency === "USD" && <p className="sub small" style={{ textAlign: "center" }}>About {naira(monthlyKobo(s, usdRate))} at today&apos;s rate of ₦{usdRate.toLocaleString("en-NG")} per $1.</p>}
      <div className="panel list">
        <div className="row between"><div><div style={{ fontWeight: 500 }}>Subscription on</div><div className="sub small">{s.is_on ? `Charges ${money(s.price_minor, s.currency)} on the ${ordinal(s.billing_day)}` : "Card frozen. Its next charge will be declined"}</div></div><Switch on={s.is_on} label="Subscription on" onChange={toggleOn} /></div>
        <div className="row between"><div><div style={{ fontWeight: 500 }}>Price-rise guard</div><div className="sub small">Decline if the charge is above {money(Math.round(s.price_minor * 1.1), s.currency)}</div></div><Switch on={s.price_guard} label="Price-rise guard" onChange={() => set("p_price_guard", !s.price_guard)} /></div>
        <div className="row between"><div style={{ fontWeight: 500 }}>Remind me 2 days before</div><Switch on={s.remind} label="Reminder" onChange={() => set("p_remind", !s.remind)} /></div>
      </div>
      <div className="stack"><h3>Payments</h3>
        <div className="panel list">
          {hist.length ? hist.map((t) => (
            <div className="row between" key={t.id}><span>{dayLabel(t.created_at)}</span>
              {t.status === "declined" ? <span className="pill bad">Declined</span> : <span className="num">{naira(t.amount_kobo)}</span>}</div>
          )) : <div className="empty">No payments yet.</div>}
        </div>
      </div>
      <div className="stack">
        <h3>Test tools</h3>
        {provider === "mock" && <button className="btn ghost block" onClick={simulate} disabled={busy}>Pretend {s.name} charges its card now</button>}
        <button className="btn ghost block" style={{ color: "var(--danger)" }} onClick={remove}>Remove from list</button>
      </div>
      <TurnOffSheet sub={offing ? s : null} onClose={() => setOffing(false)} />
    </section>
  );
}
