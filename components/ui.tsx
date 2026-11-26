"use client";
import { useEffect, useState, type ReactNode } from "react";
import { initials } from "@/lib/format";
import { brandFor, logoUrl } from "@/lib/brands";

export function Switch({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: () => void; disabled?: boolean }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={onChange} disabled={disabled} />;
}

/** Company logo if we can find one, otherwise coloured initials. */
export function Badge({ name, color, dim }: { name: string; color: string; dim?: boolean }) {
  const { domain } = brandFor(name);
  const [failed, setFailed] = useState<string | null>(null);
  const showLogo = domain && failed !== domain;
  if (showLogo) return (
    <span className="badge logo" style={{ opacity: dim ? 0.45 : 1 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl(domain)} alt="" loading="lazy" referrerPolicy="no-referrer"
        onError={() => setFailed(domain)}
        // Google sends a tiny grey globe when it has no logo: treat that as "not found".
        onLoad={(e) => e.currentTarget.naturalWidth <= 16 && setFailed(domain)} />
    </span>
  );
  return <span className="badge" style={{ background: color, opacity: dim ? 0.45 : 1 }}>{initials(name)}</span>;
}

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}
