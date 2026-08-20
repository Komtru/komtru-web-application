import { Bell, Inbox, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";

export interface TabItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Routes that should also light this tab (detail screens live under a tab). */
  matches?: string[];
}

/**
 * The customer bottom tab bar — four destinations, fixed.
 *
 * There is deliberately no discovery/browse tab: discovery happens off-platform
 * (Instagram, WhatsApp, a shared Trust Passport link) and a buyer arrives here
 * already knowing what they intend to buy.
 */
export const customerTabs: TabItem[] = [
  {
    key: "trades",
    label: "Trades",
    href: "/trades",
    icon: Inbox,
    matches: ["/trades", "/trade"],
  },
  {
    key: "passport",
    label: "Passport",
    href: "/passport",
    icon: ShieldCheck,
  },
  {
    key: "alerts",
    label: "Alerts",
    href: "/alerts",
    icon: Bell,
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: UserRound,
  },
];

export function isTabActive(tab: TabItem, pathname: string): boolean {
  const candidates = tab.matches ?? [tab.href];
  return candidates.some(
    (candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`),
  );
}

export const marketingNav = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Protection", href: "/#protection" },
  { label: "Trust passports", href: "/#trust" },
  { label: "Pricing", href: "/#pricing" },
];
