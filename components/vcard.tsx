"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { Copy, Eye } from "./icons";
import { cardsApi } from "@/lib/cards-client";
import type { Card, Sub } from "@/lib/supabase";

const group = (pan: string) => pan.replace(/(\d{4})(?=\d)/g, "$1 ");

/** One subscription's card, with Show details and Copy number. */
export function SubCard({ sub, card, autoReveal }: { sub: Sub; card: Card | undefined; autoReveal?: boolean }) {
  const { toast, reload } = useStore();
  const [shown, setShown] = useState<{ pan: string; cvv: string } | null>(null);
  const ready = card?.status === "active";

  async function details() {
    try { return await cardsApi.reveal(sub.id); } catch (e) { toast(e instanceof Error ? e.message : "Couldn't load card details"); return null; }
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
        <div className="row between"><span className="brand">{sub.name}</span><span className="chip" /></div>
        <div className="pan">{!ready ? (card?.status === "failed" ? "Card couldn't be made" : "Making your card…") : shown ? group(shown.pan) : `•••• •••• •••• ${card!.last4}`}</div>
        <div className="row between">
          <div><div className="lbl">Card holder</div><div className="val">{card?.holder_name ?? ""}</div></div>
          <div><div className="lbl">Expires</div><div className="val">{exp}</div></div>
          <div><div className="lbl">CVV</div><div className="val">{shown ? shown.cvv : "•••"}</div></div>
        </div>
      </div>
      {card?.status === "failed" && (
        <button className="btn ghost block" onClick={async () => { try { await cardsApi.issue(sub.id); await reload(); } catch (e) { toast(e instanceof Error ? e.message : "Couldn't retry"); } }}>Try making the card again</button>
      )}
      {ready && (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={reveal}><Eye />{shown ? "Hide details" : "Show details"}</button>
          <button className="btn ghost" style={{ flex: 1 }} onClick={copy}><Copy />Copy number</button>
        </div>
      )}
    </div>
  );
}
