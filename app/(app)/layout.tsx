"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StoreProvider } from "@/components/store";
import { CardI, HomeI, ListI, SubsI } from "@/components/icons";

const TABS = [
  { href: "/home", label: "Home", Icon: HomeI },
  { href: "/card", label: "Card", Icon: CardI },
  { href: "/subs", label: "Subscriptions", Icon: SubsI },
  { href: "/history", label: "History", Icon: ListI },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <StoreProvider>
      <div className="shell">
        <div className="testbar">Test mode: payments and card are pretend for now</div>
        {children}
        <nav className="tabs" aria-label="Main">
          {TABS.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={path === href || path.startsWith(href + "/") ? "page" : undefined}>
              <Icon />{label}
            </Link>
          ))}
        </nav>
      </div>
    </StoreProvider>
  );
}
