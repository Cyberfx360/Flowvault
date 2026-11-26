import Link from "next/link";
import { Back } from "@/components/icons";

// Company details shown on Terms, Privacy and Profile.
export const LEGAL = {
  company: "Krevox Global Ltd",
  rc: "RC 9223711",
  address: "Back of Africa House, Ogwashi-Uku, Delta State, Nigeria",
  email: "imidoglobal@gmail.com",
  updated: "26 November 2026",
};

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="shell">
      <section className="screen legal">
        <div className="topbar">
          <Link className="icon-btn" href="/" aria-label="Back"><Back /></Link>
          <h2 style={{ fontSize: 20 }}>{title}</h2>
          <span style={{ width: 44 }} />
        </div>
        <p className="callout warn small" style={{ margin: 0 }}>
          Draft, last updated {LEGAL.updated}. To be reviewed by a lawyer before Flowvault goes live.
        </p>
        <article className="stack" style={{ gap: 14 }}>{children}</article>
        <p className="sub small" style={{ textAlign: "center" }}>
          <Link href="/terms">Terms and Conditions</Link> · <Link href="/privacy">Privacy Policy</Link>
        </p>
      </section>
    </div>
  );
}
