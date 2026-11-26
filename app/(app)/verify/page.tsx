"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { Back, Info, Logout } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { cardsApi } from "@/lib/cards-client";

/** Shrinks a phone photo to a JPEG of at most 1280px (a few hundred KB) so it uploads quickly. */
async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

/** ID check for real cards. The card company needs these details by law; Flowvault doesn't keep them. */
export default function Verify() {
  return <Suspense fallback={<div className="loading">Loading…</div>}><VerifyScreen /></Suspense>;
}

function VerifyScreen() {
  const { profile, reload, toast, cards } = useStore();
  const router = useRouter();
  const welcome = useSearchParams().get("welcome") === "1"; // came straight from sign-up
  const done = "/home";
  const [state, setState] = useState<{ available: boolean; verified: boolean; tier?: number } | null>(null);
  const [idPic, setIdPic] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { fetch("/api/verify").then((r) => r.json()).then(setState).catch(() => setState({ available: false, verified: false })); }, []);
  // The app stays locked until BVN and NIN are both checked (Kenneth's rule), so there's no skipping.
  const verified = !!(state?.verified || profile?.verified);
  async function signOut() { await supabase.auth.signOut(); router.replace("/"); router.refresh(); }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error || "Couldn't verify. Please try again.");
    setState({ available: true, verified: false, tier: 1 }); window.scrollTo(0, 0);
  }

  async function submitId(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!idPic || !selfie) return setErr("Add a photo of your ID and a selfie.");
    setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/verify/id", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idType: f.get("idType"), idNumber: f.get("idNumber"), idImage: idPic, selfie }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return setErr(j.error || "Couldn't finish the ID check. Please try again."); }
    // Cards that failed because the check wasn't finished get made now.
    await Promise.all(cards.filter((c) => c.provider === "maplerad" && c.status === "failed").map((c) => cardsApi.issue(c.subscription_id).catch(() => {})));
    setBusy(false);
    await reload(); toast("You're verified. New subscriptions now get real cards."); router.replace(done);
  }
  const pick = (set: (v: string) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { set(await shrink(file)); } catch { setErr("Couldn't read that photo. Try another one."); }
  };

  const [first, ...rest] = (profile?.full_name ?? "").split(" ");
  return (
    <section className="screen">
      <div className="topbar">{verified ? <Link className="icon-btn" href="/home" aria-label="Back"><Back /></Link> : <span />}
        {!verified && <button className="btn link" onClick={signOut}><Logout />Sign out</button>}</div>
      <div className="stack" style={{ gap: 6 }}>{welcome && <p className="sub small">Welcome to Flowvault</p>}<h2>Verify your ID</h2>
        <p className="sub">You need to do this before you can use Flowvault. Two quick steps: your BVN, then your NIN with a photo of your NIN slip or card and a selfie. Real cards come from our card partner, Maplerad. By law they need to know who you are before they make a card. Flowvault sends your details and photos straight to them and doesn&apos;t keep the photos.</p></div>
      {!state ? <div className="loading">Loading…</div>
        : !state.available ? <div className="callout"><Info /><span>The ID check isn&apos;t available right now. Please try again a little later.</span></div>
        : state.verified || profile?.verified ? <div className="callout"><Info /><span>You&apos;re verified. Every new subscription you add gets a real card.</span></div>
        : (state.tier ?? 0) >= 1 ? (
        <form className="stack" style={{ gap: 14 }} onSubmit={submitId}>
          <div className="callout"><Info /><span><b>Step 2 of 2.</b> Your BVN is checked. Now add your NIN and a selfie.</span></div>
          <input type="hidden" id="v-idtype" name="idType" value="NIN" />
          <div className="field"><label htmlFor="v-idnum">NIN</label><input id="v-idnum" name="idNumber" required autoComplete="off" inputMode="numeric" pattern="[0-9]{11}" title="Your NIN is 11 digits" maxLength={11} placeholder="11 digits" /></div>
          <div className="field"><span className="flabel">Photo of your NIN slip or card</span>
            {/* A big tappable button; the real file input is hidden behind it (iPhone-friendly). */}
            <label className="btn ghost block filepick">{idPic ? "Change photo" : "Take or choose a photo"}
              <input type="file" accept="image/*" onChange={pick(setIdPic)} /></label>
            <span className="hint">Front side, flat, all four corners in view, no glare.</span>
            {idPic && <img src={idPic} alt="Your ID" style={{ width: "100%", borderRadius: 12, marginTop: 6 }} />}</div>
          <div className="field"><span className="flabel">Selfie</span>
            <label className="btn ghost block filepick">{selfie ? "Retake selfie" : "Take a selfie"}
              <input type="file" accept="image/*" capture="user" onChange={pick(setSelfie)} /></label>
            <span className="hint">Face the camera in good light. It&apos;s matched against your ID photo.</span>
            {selfie && <img src={selfie} alt="Your selfie" style={{ width: 120, borderRadius: 12, marginTop: 6 }} />}</div>
          {err && <div className="error" role="alert">{err}</div>}
          <button className="btn primary block" disabled={busy}>{busy ? "Sending…" : "Finish ID check"}</button>
        </form>
        ) : (
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
          <button className="btn primary block" disabled={busy}>{busy ? "Checking…" : "Next: NIN"}</button>
        </form>
      )}
    </section>
  );
}
