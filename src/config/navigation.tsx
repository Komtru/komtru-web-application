import {
  BadgeCheck,
  Bell,
  FileText,
  LifeBuoy,
  Lock,
  MessageSquare,
  Package,
  Plus,
  ScrollText,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * Which live counter, if any, puts a dot on a tab.
 *
 * The counter is named rather than passed positionally so the bar stays a dumb
 * renderer: a tab declares what it watches and how loudly, and adding a third
 * counter later does not mean rewriting the bar's badge logic.
 */
export interface TabBadge {
  counter: "unread" | "needsAction";
  tone: "risk" | "success";
}

export interface TabItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Routes that should also light this tab (detail screens live under a tab). */
  matches?: string[];
  badge?: TabBadge;
}

/**
 * The customer bottom tab bar — four destinations, fixed.
 *
 * The Trust Passport is not one of them: it is something a buyer reads about a
 * seller, reached from a trade or a shared link, not a place they navigate to on
 * their own. It lives in the drawer instead.
 */
export const customerTabs: TabItem[] = [
  {
    key: "explore",
    label: "Explore",
    href: "/explore",
    icon: Package,
  },
  {
    key: "trades",
    label: "My Trades",
    href: "/trades",
    icon: ShieldCheck,
    matches: ["/trades", "/trade"],
    // Red: a trade waiting on the buyer is the one thing in the app that costs
    // them money to ignore — an inspection window closing, a payment to release.
    badge: { counter: "needsAction", tone: "risk" },
  },
  {
    key: "messages",
    label: "Messages",
    href: "/messages",
    icon: MessageSquare,
    badge: { counter: "unread", tone: "success" },
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

/**
 * The one action the bar promotes above its four destinations.
 *
 * Starting a trade is the only thing a buyer does that is not "go and look at
 * something", so it does not compete for a tab slot: it sits in the middle of
 * the bar as a raised circle, half of it above the bar's top edge.
 */
export const centerAction = {
  label: "New trade",
  href: "/trades/new",
  icon: Plus,
} satisfies { label: string; href: string; icon: LucideIcon };

export function isTabActive(tab: TabItem, pathname: string): boolean {
  const candidates = tab.matches ?? [tab.href];
  return candidates.some(
    (candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`),
  );
}

/**
 * The sidebar, not a second copy of the tab bar.
 *
 * The four destinations a customer uses constantly already have permanent
 * thumb-reachable slots at the bottom; this list is for the screens that did not
 * earn a tab but must still be reachable — the passport and the alert feed among
 * them, since neither is somewhere a buyer goes unprompted.
 */
export const drawerNav: { key: string; label: string; href: string; icon: LucideIcon }[] = [
  { key: "passport", label: "Trust passport", href: "/passport", icon: BadgeCheck },
  { key: "alerts", label: "Alerts", href: "/alerts", icon: Bell },
  { key: "account", label: "Account & security", href: "/settings", icon: Lock },
  { key: "statements", label: "Trade statements", href: "/trades", icon: FileText },
  { key: "support", label: "Get help", href: "/settings", icon: LifeBuoy },
  { key: "terms", label: "Terms & privacy", href: "/terms", icon: ScrollText },
];

export const marketingNav = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Protection", href: "/#protection" },
  { label: "Trust passports", href: "/#trust" },
  { label: "Pricing", href: "/#pricing" },
];
