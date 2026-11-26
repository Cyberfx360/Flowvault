"use client";
import { StoreProvider } from "@/components/store";
import { GlassTabs } from "@/components/glass-tabs";
import { CardI, HomeI, ListI, SubsI } from "@/components/icons";

const TABS = [
  { href: "/home", label: "Home", Icon: HomeI },
  { href: "/card", label: "Card", Icon: CardI },
  { href: "/subs", label: "Subscriptions", Icon: SubsI },
  { href: "/history", label: "History", Icon: ListI },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="shell">
        <div className="testbar">Test mode: payments and card are pretend for now</div>
        {children}
        <GlassTabs tabs={TABS} />
      </div>
    </StoreProvider>
  );
}
