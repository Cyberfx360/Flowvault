"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Back } from "@/components/icons";
import { Logo } from "@/components/logo";

export default function Login() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")).trim(), password: String(f.get("password")),
    });
    setBusy(false);
    if (error) return setError(error.message === "Invalid login credentials" ? "That email and password don't match." : error.message);
    router.replace("/home"); router.refresh();
  }

  return (
    <div className="shell">
      <section className="screen">
        <div className="topbar"><Link className="icon-btn" href="/" aria-label="Back"><Back /></Link><Logo size={36} /><span style={{ width: 44 }} /></div>
        <div className="stack"><h2>Welcome back</h2><p className="sub">Sign in to manage your subscriptions.</p></div>
        <form className="stack" style={{ gap: 16 }} onSubmit={submit}>
          <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="btn primary block" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <p className="sub small" style={{ textAlign: "center" }}>New here? <Link href="/signup" style={{ color: "var(--tint)" }}>Create an account</Link></p>
        </form>
      </section>
    </div>
  );
}
