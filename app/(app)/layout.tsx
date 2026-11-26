"use client";
import { usePathname } from "next/navigation";
import { StoreProvider } from "@/components/store";
import { GlassTabs } from "@/components/glass-tabs";
import { CardI, HomeI, ListI, SubsI } from "@/components/icons";

const TABS = [
  { href: "/home", label: "Home", Icon: HomeI },
  { href: "/card", label: "Cards", Icon: CardI },
  { href: "/subs", label: "Subscriptions", Icon: SubsI },
  { href: "/history", label: "History", Icon: ListI },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const onVerify = usePathname().startsWith("/verify"); // locked until the ID check is done: no tabs there
  return (
    <StoreProvider>
      <div className="shell">
        <div className="testbar">Test mode: payments and cards are pretend for now</div>
        {children}
        {!onVerify && <GlassTabs tabs={TABS} />}
      </div>
    </StoreProvider>
  );
}
