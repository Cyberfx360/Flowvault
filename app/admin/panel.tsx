"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Back } from "@/components/icons";
import { money, naira } from "@/lib/format";

type Wallet = { currency: string; kind: string; available: number };
type Stats = {
  users: number; verified: number; bvn_only: number; wallets_kobo: number; cards: Record<string, number>;
  topups_kobo: number; topups_count: number; topups_pending: number; test_money_kobo: number;
  fees_usd_cents: number; fees_kobo: number; mock_topups: boolean; card_fee_usd_cents: number; usd_rate: number;
  recent_topups: { reference: string; amount_kobo: number; channel: string; status: string; live: boolean; created_at: string; full_name: string | null }[];
  failed_cards: { name: string; last_error: string | null; created_at: string; full_name: string | null }[];
};
type Data = {
  stats: Stats | null; statsError: string | null; wallets: Wallet[] | null; walletsError: string | null;
  paystackKobo: number | null; paystackError: string | null; paystackLive: boolean; sweep: { on: boolean; account: boolean };
};

const LOW_SPEND_CENTS = 5000; // warn when Spend has under 50 dollars
const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" | "bad" }) {
  return (
    <div className="panel" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="small sub">{label}</span>
      <strong className="num" style={{ fontSize: 20, color: tone === "bad" ? "var(--danger)" : tone === "warn" ? "var(--warning)" : undefined }}>{value}</strong>
      {hint && <span className="small sub">{hint}</span>}
    </div>
  );
}
const Grid = ({ children }: { children: React.ReactNode }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>;
const TONE = { warn: "warning", bad: "danger", ok: "success" } as const;
const Note = ({ children, tone = "warn" }: { children: React.ReactNode; tone?: keyof typeof TONE }) => (
  <p className="small" style={{ margin: 0, padding: "10px 12px", borderRadius: 12, background: `var(--${TONE[tone]}-soft)`, color: `var(--${TONE[tone]})` }}>{children}</p>
);

export default function AdminPanel() {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [moveUsd, setMoveUsd] = useState("20");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin", { cache: "no-store" });
    setD(r.ok ? await r.json() : null);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(action: "move_to_spend" | "sweep") {
    const cents = Math.round(Number(moveUsd) * 100);
    const ask = action === "sweep"
      ? "Send the Naira in Paystack to Maplerad now?"
      : `Move $${(cents / 100).toFixed(2)} from Treasury to Spend? Maplerad takes about 3%.`;
    if (!window.confirm(ask)) return;
    setBusy(action); setResult(null);
    const r = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, cents }) });
    const j = await r.json().catch(() => ({ ok: false, message: "Failed" }));
    setResult({ ok: !!j.ok, message: j.message ?? j.error ?? "Done" });
    setBusy(""); load();
  }

  if (!d) return <div className="loading">Loading…</div>;
  const s = d.stats;
  const usd = (d.wallets ?? []).filter((w) => w.currency === "USD");
  const ngn = (d.wallets ?? []).filter((w) => w.currency === "NGN");
  const spend = usd.find((w) => w.kind === "SPEND")?.available ?? 0;
  const treasury = usd.find((w) => w.kind === "TREASURY")?.available ?? 0;
  const ngnTotal = ngn.reduce((a, w) => a + w.available, 0);
  const cards = s ? Object.entries(s.cards) : [];
  const count = (status: string) => cards.filter(([k]) => k.endsWith(":" + status)).reduce((a, [, n]) => a + n, 0);

  return (
    <section className="screen">
      <div className="topbar">
        <Link className="icon-btn" aria-label="Back to app" href="/home"><Back /></Link>
        <h2 style={{ fontSize: 20 }}>Admin</h2>
        <button className="btn link" onClick={load}>Refresh</button>
      </div>

      {result && <Note tone={result.ok ? "ok" : "bad"}>{result.message}</Note>}

      <div className="stack">
        <h3 style={{ margin: 0 }}>Maplerad money</h3>
        {d.walletsError ? <Note tone="bad">Can&apos;t read Maplerad: {d.walletsError}</Note> : (
          <>
            <Grid>
              <Tile label="USD Spend (pays cards)" value={money(spend, "USD")} tone={spend < LOW_SPEND_CENTS ? "warn" : undefined} />
              <Tile label="USD Treasury" value={money(treasury, "USD")} />
              <Tile label="Naira" value={naira(ngnTotal)} hint={ngn.length > 1 ? ngn.map((w) => w.kind || "?").join(" + ") : undefined} />
              <Tile label="Cards running" value={String(count("active"))} hint={`${count("frozen")} frozen`} />
            </Grid>
            {spend < LOW_SPEND_CENTS && (
              <Note>Spend is under $50, so new cards may fail. {treasury > 0 ? "Move some from Treasury below." : "Convert Naira to dollars in Maplerad first."}</Note>
            )}
            {ngnTotal >= 500000 && (
              <Note>{naira(ngnTotal)} is still in Naira. Maplerad&apos;s API can&apos;t convert it, so convert it to USD in the Maplerad dashboard.</Note>
            )}
            <div className="panel stack" style={{ padding: 14 }}>
              <label className="small" htmlFor="mv">Move dollars from Treasury to Spend</label>
              <div className="row">
                <span>$</span>
                <input id="mv" inputMode="decimal" value={moveUsd} onChange={(e) => setMoveUsd(e.target.value.replace(/[^0-9.]/g, ""))}
                  style={{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 10, border: "1px solid var(--line-strong)", padding: "0 12px", font: "inherit", background: "var(--bg)", color: "var(--ink)" }} />
                <button className="btn primary" disabled={!!busy || !(Number(moveUsd) >= 1)} onClick={() => act("move_to_spend")}>{busy === "move_to_spend" ? "Moving…" : "Move"}</button>
              </div>
              <a className="btn ghost block" href="https://app.maplerad.com" target="_blank" rel="noreferrer">Open Maplerad to convert Naira</a>
            </div>
          </>
        )}
      </div>

      <div className="stack">
        <h3 style={{ margin: 0 }}>Paystack</h3>
        {d.paystackError ? <Note tone="bad">{d.paystackError}</Note> : (
          <Grid>
            <Tile label={`Balance (${d.paystackLive ? "live" : "test"})`} value={naira(d.paystackKobo ?? 0)} />
            <Tile label="Daily move to Maplerad" value={d.sweep.on ? "On" : "Off"} hint={d.sweep.on && !d.sweep.account ? "Account number missing" : d.sweep.on ? "Runs once a day" : "Set AUTO_SWEEP=on"} tone={d.sweep.on && !d.sweep.account ? "bad" : undefined} />
          </Grid>
        )}
        <button className="btn ghost block" disabled={!!busy || !d.sweep.on} onClick={() => act("sweep")}>{busy === "sweep" ? "Sending…" : "Send Paystack money to Maplerad now"}</button>
      </div>

      {d.statsError ? <Note tone="bad">Can&apos;t read the database: {d.statsError}</Note> : s && (
        <>
          <div className="stack">
            <h3 style={{ margin: 0 }}>Users</h3>
            <Grid>
              <Tile label="Signed up" value={String(s.users)} />
              <Tile label="Fully verified" value={String(s.verified)} hint={`${s.bvn_only} on BVN only`} />
              <Tile label="Money in wallets" value={naira(s.wallets_kobo)} hint="Users can't withdraw" />
              <Tile label="Card fees earned" value={money(s.fees_usd_cents, "USD")} hint={`${money(s.card_fee_usd_cents, "USD")} per card`} />
            </Grid>
          </div>

          <div className="stack">
            <h3 style={{ margin: 0 }}>Top-ups</h3>
            <Grid>
              <Tile label="Paid through Paystack" value={naira(s.topups_kobo)} hint={`${s.topups_count} payment${s.topups_count === 1 ? "" : "s"}`} />
              <Tile label="Test money" value={naira(s.test_money_kobo)} hint={s.mock_topups ? "Test button still on" : "Test button off"} />
            </Grid>
            {s.topups_pending > 0 && <Note>{s.topups_pending} payment{s.topups_pending > 1 ? "s" : ""} started today but not finished yet.</Note>}
            <div className="panel list">
              {s.recent_topups.length === 0 ? <p className="empty">No Paystack top-ups yet</p> : s.recent_topups.map((t) => (
                <div key={t.reference} className="item">
                  <div className="meta">
                    <span className="name">{t.full_name || "Unknown user"}</span>
                    <span className="small">{when(t.created_at)} · {t.channel === "bank_transfer" ? "Transfer" : "Card"}{t.live ? "" : " · test"}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="amt num">{naira(t.amount_kobo)}</div>
                    <span className={`pill ${t.status === "success" ? "ok" : t.status === "failed" ? "bad" : "warn"}`}>{t.status === "success" ? "Paid" : t.status === "failed" ? "Failed" : "Waiting"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="stack">
            <h3 style={{ margin: 0 }}>Cards</h3>
            <div className="panel list">
              {cards.length === 0 ? <p className="empty">No cards yet</p> : cards.sort().map(([k, n]) => {
                const [provider, status] = k.split(":");
                return (
                  <div key={k} className="item">
                    <div className="meta"><span className="name">{provider === "mock" ? "Test cards" : "Maplerad cards"}</span></div>
                    <span className={`pill ${status === "active" ? "ok" : status === "failed" ? "bad" : status === "pending" ? "warn" : "off"}`}>{status}</span>
                    <span className="amt num" style={{ minWidth: 28 }}>{n}</span>
                  </div>
                );
              })}
            </div>
            {s.failed_cards.length > 0 && (
              <div className="panel list">
                {s.failed_cards.map((c, i) => (
                  <div key={i} className="item">
                    <div className="meta">
                      <span className="name">{c.name} · {c.full_name || "Unknown user"}</span>
                      <span className="small" style={{ whiteSpace: "normal" }}>{when(c.created_at)} · {c.last_error || "No reason given"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
