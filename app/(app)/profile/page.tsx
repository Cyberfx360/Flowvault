"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { Sheet } from "@/components/ui";
import { Back, Chevron, Logout } from "@/components/icons";
import { naira } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { LEGAL } from "@/components/legal";

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
const localPhone = (p: string | null | undefined) => (p ?? "").replace(/^\+234/, "");

export default function ProfilePage() {
  const { ready, profile, balance, subs, cards, act, toast } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState("");
  const [editing, setEditing] = useState(false);
  const [pw, setPw] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      if (data.user?.created_at) setJoined(new Date(data.user.created_at).toLocaleDateString("en-NG", { month: "long", year: "numeric" }));
    });
  }, []);
  if (!ready) return <div className="loading">Loading…</div>;

  const tier = profile?.tier ?? 0;
  const id = profile?.verified
    ? { label: "Verified", pill: "ok", hint: "Your subscriptions get real Visa cards" }
    : tier >= 1
      ? { label: "Step 2 left", pill: "warn", hint: "Add a photo of your ID and a selfie" }
      : { label: "Not verified", pill: "off", hint: "Verify with your BVN to get real cards" };
  const activeCards = cards.filter((c) => c.status === "active").length;

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/"); router.refresh();
  }

  return (
    <section className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => router.back()}><Back /></button>
        <h2 style={{ fontSize: 20 }}>Profile</h2>
        <span style={{ width: 44 }} />
      </div>

      <div className="stack" style={{ alignItems: "center", gap: 8, textAlign: "center" }}>
        <div className="avatar big" aria-hidden>{initials(profile?.full_name ?? "")}</div>
        <h2 style={{ fontSize: 22 }}>{profile?.full_name || "Your name"}</h2>
        <p className="sub small">{email}{joined && <> · Member since {joined}</>}</p>
      </div>

      <div className="stat">
        <div><span>Wallet</span><b className="num">{naira(balance)}</b></div>
        <div><span>Subscriptions</span><b className="num">{subs.length} · {activeCards} {activeCards === 1 ? "card" : "cards"}</b></div>
      </div>

      <h3 className="sub small" style={{ margin: "4px 4px -6px" }}>Your details</h3>
      <div className="panel list">
        <div className="row between"><span className="sub">Full name</span><span>{profile?.full_name}</span></div>
        <div className="row between"><span className="sub">Phone</span><span className="num">{profile?.phone || "Not added"}</span></div>
        <div className="row between"><span className="sub">Email</span><span style={{ overflowWrap: "anywhere", textAlign: "right" }}>{email}</span></div>
        <button className="item" onClick={() => setEditing(true)}>
          <span className="meta"><span className="name" style={{ color: "var(--tint)" }}>Edit details</span></span><Chevron />
        </button>
      </div>

      <h3 className="sub small" style={{ margin: "4px 4px -6px" }}>Security</h3>
      <div className="panel list">
        <Link className="item" href="/verify">
          <span className="meta"><span className="name">ID check</span><span className="small">{id.hint}</span></span>
          <span className={"pill " + id.pill}>{id.label}</span>
          <Chevron />
        </Link>
        <button className="item" onClick={() => setPw(true)}>
          <span className="meta"><span className="name">Change password</span><span className="small">Pick a new password for signing in</span></span>
          <Chevron />
        </button>
      </div>

      <button className="btn ghost block" onClick={signOut}><Logout />Sign out</button>
      <p className="sub small" style={{ textAlign: "center" }}>Money in Flowvault can only pay subscriptions. It can&apos;t be withdrawn.</p>
      <p className="sub small" style={{ textAlign: "center", marginTop: -8 }}><Link href="/terms">Terms and Conditions</Link> · <Link href="/privacy">Privacy Policy</Link>
        <br />Need help? <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></p>

      <EditSheet open={editing} onClose={() => setEditing(false)} name={profile?.full_name ?? ""} phone={localPhone(profile?.phone)} locked={!!profile?.verified}
        save={async (n, p) => { const ok = await act("update_profile", { p_full_name: n, p_phone: p }); if (ok !== undefined) { toast("Details saved"); setEditing(false); } }} />
      <PasswordSheet open={pw} onClose={() => setPw(false)} done={() => { setPw(false); toast("Password changed"); }} />
    </section>
  );
}

function EditSheet({ open, onClose, name, phone, locked, save }: { open: boolean; onClose: () => void; name: string; phone: string; locked: boolean; save: (n: string, p: string | null) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = locked ? name : String(f.get("name")).trim();
    const digits = String(f.get("phone")).replace(/\D/g, "").replace(/^234/, "").replace(/^0/, "");
    if (n.length < 2) return setErr("Enter your full name.");
    if (digits && digits.length !== 10) return setErr("Enter a valid phone number, like 803 000 0000.");
    setErr(""); setBusy(true);
    await save(n, digits ? "+234" + digits : null);
    setBusy(false);
  }
  return (
    <Sheet open={open} onClose={onClose} label="Edit details">
      <h2 style={{ fontSize: 22 }}>Edit details</h2>
      <form key={String(open)} className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <div className="field"><label htmlFor="p-name">Full name</label>
          <input id="p-name" name="name" defaultValue={name} disabled={locked} autoComplete="name" maxLength={80} />
          {locked && <span className="hint">Your name is locked because it was checked against your ID.</span>}</div>
        <div className="field"><label htmlFor="p-phone">Phone number</label>
          <div className="phoneInput"><span>🇳🇬 +234</span><input id="p-phone" name="phone" defaultValue={phone} inputMode="tel" autoComplete="tel-national" placeholder="803 000 0000" /></div></div>
        {err && <div className="error" role="alert">{err}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </form>
    </Sheet>
  );
}

function PasswordSheet({ open, onClose, done }: { open: boolean; onClose: () => void; done: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const a = String(f.get("pw")), b = String(f.get("pw2"));
    if (a.length < 8) return setErr("Use at least 8 characters.");
    if (a !== b) return setErr("The two passwords don't match.");
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: a });
    setBusy(false);
    if (error) return setErr(error.message);
    done();
  }
  return (
    <Sheet open={open} onClose={onClose} label="Change password">
      <h2 style={{ fontSize: 22 }}>Change password</h2>
      <form key={String(open)} className="stack" style={{ gap: 14 }} onSubmit={submit}>
        <div className="field"><label htmlFor="pw">New password</label><input id="pw" name="pw" type="password" minLength={8} required autoComplete="new-password" /><span className="hint">At least 8 characters.</span></div>
        <div className="field"><label htmlFor="pw2">Type it again</label><input id="pw2" name="pw2" type="password" minLength={8} required autoComplete="new-password" /></div>
        {err && <div className="error" role="alert">{err}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
      </form>
    </Sheet>
  );
}
