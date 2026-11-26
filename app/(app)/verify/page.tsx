"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { Back, Info } from "@/components/icons";

/** ID check for real cards. The card company needs these details by law; Flowvault doesn't keep them. */
export default function Verify() {
  const { profile, reload, toast } = useStore();
  const router = useRouter();
  const [state, setState] = useState<{ available: boolean; verified: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { fetch("/api/verify").then((r) => r.json()).then(setState).catch(() => setState({ available: false, verified: false })); }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error || "Couldn't verify. Please try again.");
    await reload(); toast("You're verified. New subscriptions now get real cards."); router.replace("/card");
  }

  const [first, ...rest] = (profile?.full_name ?? "").split(" ");
  return (
    <section className="screen">
      <div className="topbar"><Link className="icon-btn" href="/card" aria-label="Back"><Back /></Link><span style={{ width: 44 }} /></div>
      <div className="stack" style={{ gap: 6 }}><h2>Verify your ID</h2>
        <p className="sub">Real cards come from our card partner, Maplerad. By law they need to know who you are before they make a card. Flowvault sends these details to them and doesn&apos;t keep them.</p></div>
      {!state ? <div className="loading">Loading…</div>
        : !state.available ? <div className="callout"><Info /><span>Real cards aren&apos;t switched on yet. You can keep using test cards for now.</span></div>
        : state.verified || profile?.verified ? <div className="callout"><Info /><span>You&apos;re verified. Every new subscription you add gets a real card.</span></div>
        : (
        <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
          <div className="two">
            <div className="field"><label htmlFor="v-first">First name</label><input id="v-first" name="firstName" defaultValue={first} required autoComplete="given-name" /></div>
            <div className="field"><label htmlFor="v-last">Last name</label><input id="v-last" name="lastName" defaultValue={rest.join(" ")} required autoComplete="family-name" /></div>
          </div>
          <div className="field"><label htmlFor="v-bvn">BVN</label><input id="v-bvn" name="bvn" inputMode="numeric" pattern="\d{11}" maxLength={11} required placeholder="11 digits" autoComplete="off" />
            <span className="hint">Dial *565*0# on the phone linked to your bank to see it.</span></div>
          <div className="field"><label htmlFor="v-dob">Date of birth</label><input id="v-dob" name="dob" type="date" required autoComplete="bday" /></div>
          <div className="field"><label htmlFor="v-phone">Phone number</label><input id="v-phone" name="phone" inputMode="tel" required defaultValue={profile?.phone ?? ""} placeholder="0803 000 0000" autoComplete="tel" /></div>
          <div className="field"><label htmlFor="v-street">Home address</label><input id="v-street" name="street" required placeholder="12 Adeola Odeku Street" autoComplete="street-address" /></div>
          <div className="two">
            <div className="field"><label htmlFor="v-city">City</label><input id="v-city" name="city" required placeholder="Lagos" autoComplete="address-level2" /></div>
            <div className="field"><label htmlFor="v-state">State</label><input id="v-state" name="state" required placeholder="Lagos" autoComplete="address-level1" /></div>
          </div>
          <div className="field"><label htmlFor="v-post">Postal code</label><input id="v-post" name="postalCode" required placeholder="101233" autoComplete="postal-code" /></div>
          {err && <div className="error" role="alert">{err}</div>}
          <button className="btn primary block" disabled={busy}>{busy ? "Checking…" : "Verify and turn on real cards"}</button>
        </form>
      )}
    </section>
  );
}
