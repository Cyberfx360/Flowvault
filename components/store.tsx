"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase, type Card, type Profile, type Sub, type Txn } from "@/lib/supabase";

type Data = {
  ready: boolean;
  profile: Profile | null;
  balance: number;
  cards: Card[];
  provider: string;
  subs: Sub[];
  txns: Txn[];
  usdRate: number;
};
type Store = Data & {
  reload: () => Promise<void>;
  toast: (msg: string) => void;
  /** Calls a database function, shows its error as a toast, reloads data. */
  act: <T = unknown>(fn: string, args?: Record<string, unknown>) => Promise<T | undefined>;
  /** Runs a server call (card company work), shows its error as a toast, reloads data. */
  run: <T = unknown>(p: () => Promise<T>) => Promise<T | undefined>;
  cardFor: (subId: string) => Card | undefined;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Data>({ ready: false, profile: null, balance: 0, cards: [], provider: "mock", subs: [], txns: [], usdRate: 1550 });
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((m: string) => {
    setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(""), 2600);
  }, []);

  const reload = useCallback(async () => {
    // First visit creates the Flowvault wallet and card; after that it does nothing.
    await supabase.rpc("fv_ensure_account");
    const { data, error } = await supabase.rpc("fv_state");
    if (error || !data) { setD((d) => ({ ...d, ready: true })); setMsg("Couldn't load your account. Please refresh the page."); return; }
    const st = data as { profile: Profile | null; balance: number | null; cards: Card[]; card_provider: string | null; subs: Sub[]; txns: Txn[]; usd_rate: number | null };
    setD({
      ready: true,
      profile: st.profile, balance: Number(st.balance ?? 0), cards: st.cards ?? [], provider: st.card_provider ?? "mock",
      subs: st.subs.map((x) => ({ ...x, price_minor: Number(x.price_minor) })),
      txns: st.txns.map((x) => ({ ...x, amount_kobo: Number(x.amount_kobo) })),
      usdRate: Number(st.usd_rate ?? 1550),
    });
  }, []);

  const act = useCallback(async <T,>(fn: string, args: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.rpc("fv_" + fn, args);
    if (error) { toast(error.message); return undefined; }
    await reload();
    return data as T;
  }, [reload, toast]);

  const run = useCallback(async <T,>(p: () => Promise<T>) => {
    try { const r = await p(); await reload(); return r; }
    catch (e) { toast(e instanceof Error ? e.message : "Something went wrong"); return undefined; }
  }, [reload, toast]);

  const cardFor = useCallback((subId: string) => d.cards.find((c) => c.subscription_id === subId), [d.cards]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <Ctx.Provider value={{ ...d, reload, toast, act, run, cardFor }}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </Ctx.Provider>
  );
}

/** Monthly cost of a subscription in kobo (dollar ones converted at today's rate). */
export const monthlyKobo = (s: Sub, usdRate: number) =>
  s.currency === "USD" ? Math.ceil(s.price_minor * usdRate) : s.price_minor;
