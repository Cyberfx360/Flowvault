import Link from "next/link";
import { Check } from "@/components/icons";
import { Wordmark } from "@/components/logo";

export default function Welcome() {
  return (
    <div className="shell">
      <section className="screen welcome">
        <Wordmark size={32} />
        <div className="art">
          <div className="vcard">
            <div className="row between"><span className="brand">Flowvault</span><span className="chip" /></div>
            <div className="pan">•••• •••• •••• ••••</div>
            <div className="row between"><div><div className="lbl">Card holder</div><div className="val">YOUR NAME</div></div><div><div className="lbl">Network</div><div className="val">VISA</div></div></div>
          </div>
        </div>
        <div className="stack" style={{ gap: 20 }}>
          <h2>A card for every subscription.</h2>
          <ul className="points">
            <li><Check /><span><b>Top up once</b>, and your money stays put for subscriptions only.</span></li>
            <li><Check /><span><b>Each subscription gets its own card</b>, for Netflix, Spotify, DStv and the rest.</span></li>
            <li><Check /><span><b>Switch any subscription off</b> in one tap. Its card freezes, so no surprise charges.</span></li>
          </ul>
          <div className="stack">
            <Link className="btn primary block" href="/signup">Create account</Link>
            <Link className="btn ghost block" href="/login">I already have an account</Link>
          </div>
          <p className="sub small" style={{ textAlign: "center" }}><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p>
        </div>
      </section>
    </div>
  );
}
