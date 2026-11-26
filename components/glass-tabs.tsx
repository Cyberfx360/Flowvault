"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ComponentType } from "react";

type Tab = { href: string; label: string; Icon: ComponentType };

/**
 * Bottom nav with a glass "lens" that springs between tabs.
 * Tap a tab and the lens slides over with a little stretch; drag your finger
 * along the bar and the lens follows, then snaps to the nearest tab when you let go.
 */
export function GlassTabs({ tabs }: { tabs: Tab[] }) {
  const path = usePathname();
  const router = useRouter();
  const nav = useRef<HTMLElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const active = Math.max(0, tabs.findIndex((t) => path === t.href || path.startsWith(t.href + "/")));

  // Motion state lives in a ref so animating never re-renders React.
  const m = useRef({ x: 0, v: 0, target: 0, w: 0, pad: 6, dragging: false, lift: 0, startX: 0, moved: false, raf: 0, last: 0, moveT: 0, ready: false });
  const reduce = useRef(false);

  const draw = () => {
    const s = m.current, el = thumb.current;
    if (!el) return;
    const speed = reduce.current ? 0 : Math.min(1, Math.abs(s.v) / 3000);
    const sx = 1 + speed * 0.28 + s.lift * 0.06; // stretch along the direction of travel
    const sy = 1 - speed * 0.14 + s.lift * 0.06; // and squish a little the other way
    el.style.width = s.w + "px";
    el.style.transform = `translateX(${s.x}px) scale(${sx}, ${sy})`;
  };

  const step = (t: number) => {
    const s = m.current;
    const dt = Math.min(0.032, (t - (s.last || t)) / 1000 || 0.016);
    s.last = t;
    if (!s.dragging) {
      // Damped spring: a bit of overshoot, settles in about 0.4s.
      const k = 520, c = 30;
      s.v += (k * (s.target - s.x) - c * s.v) * dt;
      s.x += s.v * dt;
    }
    s.lift += ((s.dragging ? 1 : 0) - s.lift) * Math.min(1, dt * 14);
    draw();
    const resting = !s.dragging && Math.abs(s.target - s.x) < 0.3 && Math.abs(s.v) < 5 && s.lift < 0.01;
    if (resting) { s.x = s.target; s.v = 0; s.lift = 0; draw(); s.raf = 0; s.last = 0; return; }
    s.raf = requestAnimationFrame(step);
  };
  const kick = () => { if (!m.current.raf) m.current.raf = requestAnimationFrame(step); };

  const slotX = (i: number) => m.current.pad + i * m.current.w;

  // Measure the bar, and keep measuring when the screen size changes.
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      const el = nav.current; if (!el) return;
      const s = m.current;
      s.pad = parseFloat(getComputedStyle(el).paddingLeft) || 6;
      s.w = (el.clientWidth - s.pad * 2) / tabs.length;
      s.target = slotX(active);
      if (!s.ready) { s.x = s.target; s.ready = true; }
      draw();
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (nav.current) ro.observe(nav.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page changed (tap, drag, or back button): spring to the new tab.
  useEffect(() => {
    const s = m.current;
    s.target = slotX(active);
    if (reduce.current) { s.x = s.target; s.v = 0; draw(); return; }
    kick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => () => cancelAnimationFrame(m.current.raf), []);

  // ----- dragging -----
  const localX = (e: React.PointerEvent) => e.clientX - nav.current!.getBoundingClientRect().left;

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const s = m.current;
    s.startX = localX(e); s.moved = false;
  };
  const onMove = (e: React.PointerEvent) => {
    const s = m.current;
    if (!(e.buttons & 1) && e.pointerType === "mouse") return;
    if (s.startX === 0 && !s.dragging) return;
    const x = localX(e);
    if (!s.dragging) {
      if (Math.abs(x - s.startX) < 8) return; // still a tap
      s.dragging = true; s.moved = true;
      nav.current!.setPointerCapture(e.pointerId);
    }
    const nx = Math.max(s.pad, Math.min(s.pad + s.w * (tabs.length - 1), x - s.w / 2));
    const now = performance.now();
    const dt = Math.max(8, now - (s.moveT || now - 16)) / 1000;
    s.moveT = now;
    s.v = ((nx - s.x) / dt) * 0.6 + s.v * 0.4;
    s.x = nx;
    kick();
  };
  const onUp = (e: React.PointerEvent) => {
    const s = m.current;
    s.startX = 0;
    if (!s.dragging) return;
    s.dragging = false;
    const i = Math.max(0, Math.min(tabs.length - 1, Math.round((s.x - s.pad) / s.w)));
    s.moveT = 0;
    s.target = slotX(i);
    kick();
    if (i !== active) router.push(tabs[i].href);
    try { nav.current!.releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <nav className="tabs" aria-label="Main" ref={nav}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onClickCapture={(e) => { if (m.current.moved) { e.preventDefault(); e.stopPropagation(); m.current.moved = false; } }}>
      <div className="glass-thumb" ref={thumb} aria-hidden />
      {tabs.map(({ href, label, Icon }, i) => (
        <Link key={href} href={href} aria-current={i === active ? "page" : undefined} draggable={false}>
          <Icon />{label}
        </Link>
      ))}
    </nav>
  );
}
