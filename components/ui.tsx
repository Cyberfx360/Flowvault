"use client";
import { useEffect, type ReactNode } from "react";
import { initials } from "@/lib/format";

export function Switch({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: () => void; disabled?: boolean }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={onChange} disabled={disabled} />;
}

export function Badge({ name, color, dim }: { name: string; color: string; dim?: boolean }) {
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
