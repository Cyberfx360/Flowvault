"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ComponentType } from "react";

type Tab = { href: string; label: string; Icon: ComponentType };

/**
 * Liquid-glass bottom nav.
 * - The highlight is a lens: press and it swells out of the bar and magnifies the icon under it;
 *   slide and it follows your finger; let go and it springs (with momentum) onto the nearest tab.
 * - The bar itself is elastic: it swells a touch when pressed, wobbles back on release,
 *   and leans toward your finger if you drag past either end.
 * - Scrolling down shrinks the bar to icons; scrolling up (or touching it) brings it back.
 * - In Chromium browsers the page behind the glass is bent at the edges like real glass.
 */
export function GlassTabs({ tabs }: { tabs: Tab[] }) {
  const path = usePathname();
  const router = useRouter();
  const nav = useRef<HTMLElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const icons = useRef<(HTMLSpanElement | null)[]>([]);
  const refractMap = useRef<SVGFEImageElement>(null);
  const active = Math.max(0, tabs.findIndex((t) => path === t.href || path.startsWith(t.href + "/")));

  // All motion state lives in a ref so animating never re-renders React.
  const m = useRef({
    x: 0, v: 0, target: 0, w: 0, pad: 6, ready: false, // lens position
    lift: 0, liftV: 0,                                    // lens swell
    bar: 1, barV: 0, barT: 1, pull: 0,                    // bar swell + rubber-band lean
    dragging: false, pressed: false, startX: 0, moved: false,
    hist: [] as { x: number; t: number }[],
    raf: 0, last: 0,
  });
  const reduce = useRef(false);
  const refractOn = useRef(false);

  // ---------- drawing ----------
  const draw = () => {
    const s = m.current, el = thumb.current, bar = nav.current;
    if (!el || !bar) return;
    const calm = reduce.current;
    const lift = calm ? 0 : Math.max(0, s.lift);
    const speed = calm ? 0 : Math.min(1, Math.abs(s.v) / 2800);
    // Lens: swells when pressed, stretches along the direction of travel, squishes the other way.
    const sx = 1 + lift * 0.3 + speed * 0.22;
    const sy = 1 + lift * 0.4 - speed * 0.12;
    el.style.width = s.w + "px";
    el.style.transform = `translateX(${s.x}px) translateY(${-lift * 3}px) scale(${sx}, ${sy})`;
    el.classList.toggle("lifted", lift > 0.2);
    // Bar: elastic swell, and a lean toward the finger past the ends.
    const b = calm ? 1 : s.bar;
    bar.style.transform = `translateX(${calm ? 0 : s.pull}px) scale(${b + Math.abs(s.pull) * 0.0015}, ${b})`;
    // Magnify whatever icon sits under the lens.
    const center = s.x + s.w / 2;
    icons.current.forEach((ic, i) => {
      if (!ic) return;
      const d = Math.abs(s.pad + (i + 0.5) * s.w - center) / s.w;
      const k = 1 + lift * 0.16 * Math.max(0, 1 - d);
      ic.style.transform = k === 1 ? "" : `scale(${k})`;
    });
  };

  // Damped spring in Apple's terms: response (seconds) and damping ratio.
  const spring = (x: number, v: number, target: number, dt: number, response: number, damping: number): [number, number] => {
    const k = (2 * Math.PI / response) ** 2, c = (4 * Math.PI * damping) / response;
    v += (k * (target - x) - c * v) * dt;
    return [x + v * dt, v];
  };

  const step = (t: number) => {
    const s = m.current;
    const dt = Math.min(0.032, s.last ? (t - s.last) / 1000 : 0.016);
    s.last = t;
    if (!s.dragging) [s.x, s.v] = spring(s.x, s.v, s.target, dt, 0.42, 0.72);
    [s.lift, s.liftV] = spring(s.lift, s.liftV, s.dragging || s.pressed ? 1 : 0, dt, 0.3, 0.68);
    [s.bar, s.barV] = spring(s.bar, s.barV, s.barT, dt, 0.36, 0.42); // low damping = wobble
    if (!s.dragging) s.pull += (0 - s.pull) * Math.min(1, dt * 14);
    draw();
    const still = !s.dragging && !s.pressed &&
      Math.abs(s.target - s.x) < 0.3 && Math.abs(s.v) < 4 &&
      Math.abs(s.lift) < 0.005 && Math.abs(s.liftV) < 0.05 &&
      Math.abs(s.bar - s.barT) < 0.0005 && Math.abs(s.barV) < 0.005 && Math.abs(s.pull) < 0.2;
    if (still) { s.x = s.target; s.v = 0; s.lift = 0; s.bar = s.barT; s.pull = 0; draw(); s.raf = 0; s.last = 0; return; }
    s.raf = requestAnimationFrame(step);
  };
  const kick = () => { if (!m.current.raf) m.current.raf = requestAnimationFrame(step); };
  const slotX = (i: number) => m.current.pad + i * m.current.w;
  const clampI = (i: number) => Math.max(0, Math.min(tabs.length - 1, i));

  // ---------- refraction maps (Chromium only) ----------
  // A displacement map: neutral grey in the middle, pushing pixels toward the centre near the rim,
  // which is how a thick glass edge bends what's behind it.
  const makeMap = (w: number, h: number, band: number) => {
    const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d")!; const img = ctx.createImageData(W, H); const r = H / 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const cx = Math.min(Math.max(x, r), W - r), dx = x - cx, dy = y - r;
      const dist = Math.hypot(dx, dy), edge = r - dist;
      let px = 0, py = 0;
      if (edge < band && dist > 0) { const f = Math.pow(1 - Math.max(0, edge) / band, 2); px = (-dx / dist) * f; py = (-dy / dist) * f; }
      const o = (y * W + x) * 4;
      img.data[o] = 128 + px * 127; img.data[o + 1] = 128 + py * 127; img.data[o + 2] = 128; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return { url: c.toDataURL(), W, H };
  };
  const buildMaps = () => {
    if (!refractOn.current || !nav.current) return;
    const r = nav.current.getBoundingClientRect();
    const set = (el: SVGFEImageElement | null, mp: { url: string; W: number; H: number }) => {
      el?.setAttribute("href", mp.url); el?.setAttribute("width", String(mp.W)); el?.setAttribute("height", String(mp.H));
    };
    set(refractMap.current, makeMap(r.width, r.height, 16));
  };

  // ---------- setup ----------
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ua = navigator.userAgent;
    // Only Chromium can bend the backdrop with an SVG filter; every iOS browser is WebKit.
    refractOn.current = /Chrome|Chromium|Edg\//.test(ua) && !/iPhone|iPad|iPod/.test(ua) && !reduce.current;
    nav.current?.classList.toggle("refract", refractOn.current);

    let mapTimer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const el = nav.current; if (!el) return;
      const s = m.current;
      s.pad = parseFloat(getComputedStyle(el).paddingLeft) || 6;
      s.w = (el.clientWidth - s.pad * 2) / tabs.length;
      s.target = slotX(active);
      if (!s.dragging) { s.x = s.target; s.ready = true; }
      draw();
      clearTimeout(mapTimer); mapTimer = setTimeout(buildMaps, 150);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (nav.current) ro.observe(nav.current);

    // Shrink to icons while scrolling down; grow back when scrolling up.
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY, dy = y - lastY;
      if (Math.abs(dy) < 6) return;
      nav.current?.classList.toggle("compact", dy > 0 && y > 60);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const raf = m.current;
    return () => { ro.disconnect(); window.removeEventListener("scroll", onScroll); clearTimeout(mapTimer); cancelAnimationFrame(raf.raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page changed (tap, drag, or back button): spring to the new tab.
  useEffect(() => {
    const s = m.current;
    s.target = slotX(active);
    nav.current?.classList.remove("compact");
    if (reduce.current) { s.x = s.target; s.v = 0; draw(); return; }
    kick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // ---------- touch ----------
  const localX = (e: React.PointerEvent) => e.clientX - nav.current!.getBoundingClientRect().left;

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const s = m.current;
    nav.current?.classList.remove("compact");
    s.startX = localX(e); s.moved = false; s.pressed = true; s.hist = [{ x: s.startX, t: performance.now() }];
    s.barT = 1.035; // the glass swells under your touch
    s.target = slotX(clampI(Math.floor((s.startX - s.pad) / s.w)));
    kick();
  };
  const onMove = (e: React.PointerEvent) => {
    const s = m.current;
    if (!s.pressed) return;
    const x = localX(e);
    if (!s.dragging) {
      if (Math.abs(x - s.startX) < 8) return; // still a tap
      s.dragging = true; s.moved = true;
      nav.current!.setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    s.hist.push({ x, t: now }); if (s.hist.length > 6) s.hist.shift();
    const lo = s.pad, hi = s.pad + s.w * (tabs.length - 1);
    const want = x - s.w / 2;
    // Rubber-band past the ends: the lens resists and the whole bar leans toward your finger.
    const over = want < lo ? want - lo : want > hi ? want - hi : 0;
    const rb = (o: number) => (o * 60 * 0.55) / (60 + 0.55 * Math.abs(o));
    const prevX = s.x, prevT = s.hist[s.hist.length - 2]?.t ?? now - 16;
    s.x = Math.max(lo, Math.min(hi, want)) + rb(over) * 0.5;
    s.pull = rb(over) * 0.35;
    s.v = (s.x - prevX) / Math.max(0.008, (now - prevT) / 1000);
    kick();
  };
  const onUp = (e: React.PointerEvent) => {
    const s = m.current;
    const wasDrag = s.dragging;
    s.pressed = false; s.dragging = false; s.barT = 1;
    if (e.type === "pointercancel" && !wasDrag) { s.target = slotX(active); kick(); return; }
    if (!wasDrag) { kick(); return; } // a tap: the link does the navigation
    // Release velocity from recent movement, then project where the flick was heading.
    const h = s.hist, a = h[0], b = h[h.length - 1];
    const vel = a && b && b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0;
    const projected = s.x + ((vel / 1000) * 0.99) / (1 - 0.99);
    const i = clampI(Math.round((projected - s.pad) / s.w));
    s.v = vel; s.target = slotX(i);
    kick();
    if (i !== active) router.push(tabs[i].href);
    try { nav.current!.releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <nav className="tabs" aria-label="Main" ref={nav}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onClickCapture={(e) => { if (m.current.moved) { e.preventDefault(); e.stopPropagation(); m.current.moved = false; } }}>
      <svg className="fv-filters" aria-hidden focusable="false">
        <filter id="fv-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage ref={refractMap} x="0" y="0" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="28" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="glass-thumb" ref={thumb} aria-hidden />
      {tabs.map(({ href, label, Icon }, i) => (
        <Link key={href} href={href} aria-current={i === active ? "page" : undefined} draggable={false}>
          <span className="inner" ref={(el) => { icons.current[i] = el; }}>
            <span className="ico"><Icon /></span>
            <span className="lbl">{label}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
