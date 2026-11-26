"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Back, Info } from "@/components/icons";
import { Logo } from "@/components/logo";

export default function Signup() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    const { data, error } = await supabase.auth.signUp({
      email: String(f.get("email")).trim(),
      password: String(f.get("password")),
      options: { data: { full_name: String(f.get("name")).trim(), phone: "+234" + String(f.get("phone")).replace(/\D/g, "").replace(/^0/, "") } },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.session) router.replace("/verify?welcome=1"); // ID check right after sign-up; the app stays locked until it's done
    else setSent(true); // email confirmation is switched on in Supabase
  }

  if (sent) return (
    <div className="shell"><section className="screen">
      <h2>Check your email</h2>
      <p className="sub">We sent you a link to confirm your account. Open it, then sign in.</p>
      <Link className="btn primary block" href="/login">Go to sign in</Link>
    </section></div>
  );

  return (
    <div className="shell">
      <section className="screen">
        <div className="topbar"><Link className="icon-btn" href="/" aria-label="Back"><Back /></Link><Logo size={36} /><span style={{ width: 44 }} /></div>
        <div className="stack"><h2>Create your Flowvault</h2><p className="sub">It takes a minute. Add a subscription and its card is made for you.</p></div>
        <form className="stack" style={{ gap: 16 }} onSubmit={submit}>
          <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" required autoComplete="name" /></div>
          <div className="field"><label htmlFor="phone">Phone number</label>
            <div className="phoneInput"><span>🇳🇬 +234</span><input id="phone" name="phone" required inputMode="tel" autoComplete="tel-national" placeholder="803 000 0000" /></div></div>
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" /><span className="hint">At least 8 characters.</span></div>
          <div className="callout"><Info /><span>Money you add to Flowvault can only pay subscriptions. It can't be withdrawn back to your bank.</span></div>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn primary block" type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </form>
      </section>
    </div>
  );
}
