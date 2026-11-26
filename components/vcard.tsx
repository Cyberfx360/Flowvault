"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { Copy, Eye } from "./icons";
import { cardsApi } from "@/lib/cards-client";
import type { Card, Sub } from "@/lib/supabase";
import type { CardDetails } from "@/lib/cards/types";
import { networkFromPan } from "@/lib/cards/network";

const group = (pan: string) => pan.replace(/(\d{4})(?=\d)/g, "$1 ");

/** Visa or Mastercard: the card number decides when it's showing, else what's stored (the server keeps it in line with the number). */
function networkOf(pan: string | undefined, stored: string | undefined): "Visa" | "Mastercard" {
  return networkFromPan(pan) ?? (/master/i.test(stored ?? "") ? "Mastercard" : "Visa");
}

/** The network mark on the card face. */
function NetworkLogo({ network }: { network: "Visa" | "Mastercard" }) {
  return network === "Mastercard" ? (
    <svg className="netlogo" viewBox="0 0 48 30" role="img" aria-label="Mastercard">
      <circle cx="17" cy="15" r="12" fill="#eb001b" /><circle cx="31" cy="15" r="12" fill="#f79e1b" />
      <path d="M24 5.4a12 12 0 0 1 0 19.2 12 12 0 0 1 0-19.2z" fill="#ff5f00" />
    </svg>
  ) : (
    <span className="netlogo visa" role="img" aria-label="Visa">VISA</span>
  );
}

/** One subscription's card, with Show details and Copy number. */
export function SubCard({ sub, card, autoReveal }: { sub: Sub; card: Card | undefined; autoReveal?: boolean }) {
  const { toast, reload } = useStore();
  const [shown, setShown] = useState<(CardDetails & { test?: boolean }) | null>(null);
  const ready = card?.status === "active";

  async function details() {
    try { const d = await cardsApi.reveal(sub.id); if (networkFromPan(d.pan) && networkFromPan(d.pan) !== card?.network) reload(); return d; } catch (e) { toast(e instanceof Error ? e.message : "Couldn't load card details"); return null; }
  }
  // While the card company is still making the card, check again every few seconds (up to 2 minutes).
  useEffect(() => {
    if (card?.status !== "pending") return;
    let n = 0;
    const t = setInterval(() => {
      if (++n > 30) return clearInterval(t);
      cardsApi.issue(sub.id).catch(() => {}).finally(reload); // also picks the card up if the webhook is late
    }, 4000);
    return () => clearInterval(t);
  }, [card?.status, reload, sub.id]);

  // A brand-new card opens with its details showing, ready to copy.
  const did = useRef(false);
  useEffect(() => {
    if (autoReveal && ready && !did.current) { did.current = true; details().then((d) => d && setShown(d)); }
  }); // eslint-disable-line react-hooks/exhaustive-deps
  async function reveal() { if (shown) return setShown(null); setShown(await details()); }
  async function copy() {
    const d = shown ?? (await details());
    if (!d) return;
    try { await navigator.clipboard.writeText(d.pan); toast(`Card number copied. Paste it at ${sub.name}.`); } catch { toast("Couldn't copy. Tap Show details instead."); }
  }

  const exp = card?.exp_month && card.exp_year ? `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}` : "••/••";
  const frozen = !!card?.frozen || !sub.is_on;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className={"vcard" + (frozen ? " frozen" : "")}>
        <div className="row between"><span className="brand">{sub.name}</span><NetworkLogo network={networkOf(shown?.pan, card?.network)} /></div>
        <span className="chip" />
        <div className="pan">{!ready ? (card?.status === "failed" ? "Card couldn't be made" : "Making your card…") : shown ? group(shown.pan) : `•••• •••• •••• ${card!.last4}`}</div>
        <div className="row between">
          <div><div className="lbl">Card holder</div><div className="val">{card?.holder_name ?? ""}</div></div>
          <div><div className="lbl">Expires</div><div className="val">{exp}</div></div>
          <div><div className="lbl">CVV</div><div className="val">{shown ? shown.cvv : "•••"}</div></div>
        </div>
      </div>
      {card?.status === "failed" && card.last_error && <div className="error" role="alert">{card.last_error === "Insufficient balance" ? "Insufficient balance. Add money to your wallet, then try again." : `Maplerad said: ${card.last_error}`}</div>}
      {card?.status === "failed" && (
        <button className="btn ghost block" onClick={async () => { try { await cardsApi.issue(sub.id); await reload(); } catch (e) { toast(e instanceof Error ? e.message : "Couldn't retry"); } }}>Try making the card again</button>
      )}
      {ready && (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={reveal}><Eye />{shown ? "Hide details" : "Show details"}</button>
          <button className="btn ghost" style={{ flex: 1 }} onClick={copy}><Copy />Copy number</button>
        </div>
      )}
      {ready && shown && <Address a={shown.address} test={shown.test} />}
    </div>
  );
}

/** Billing address for the card, with a copy button on each line. Sites ask for it when you add the card. */
function Address({ a, test }: { a: CardDetails["address"]; test?: boolean }) {
  const { toast } = useStore();
  if (!a) return <div className="callout"><span>The card company didn&apos;t send a billing address for this card. If a site asks for one, use your own address.</span></div>;
  const rows: [string, string][] = [["Street", a.street], ["City", a.city], ["State", a.state], ["ZIP / postal code", a.postal_code], ["Country", a.country]];
  async function copy(label: string, v: string) {
    try { await navigator.clipboard.writeText(v); toast(`${label} copied`); } catch { toast("Couldn't copy"); }
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      <h3 className="sub small" style={{ margin: "6px 4px 0" }}>Billing address{test ? " (test card, not real)" : ""}</h3>
      <div className="panel list">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <button key={k} className="item" onClick={() => copy(k, v)} aria-label={`Copy ${k}`}>
            <span className="meta"><span className="small">{k}</span><span className="name">{v}</span></span><Copy />
          </button>
        ))}
      </div>
      <button className="btn link" onClick={() => copy("Address", rows.map(([, v]) => v).filter(Boolean).join(", "))}>Copy whole address</button>
    </div>
  );
}
