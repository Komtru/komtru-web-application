"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { centerAction, customerTabs, isTabActive, type TabItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

/** Diameter of the raised centre button, and the gap the tabs leave for it. */
const ACTION_SIZE = 56;
const ACTION_GUTTER = 72;
/**
 * How far the button stands above the bar's top edge.
 *
 * Deliberately less than half the diameter: a true half-circle reads as a
 * separate object balanced on the bar, while a shallower cap keeps the bar's
 * top edge as the dominant line and lets the button sit *in* the bar. Kept
 * under the bar's own top padding (8px) plus icon row so the lower part stays
 * fully seated on the card rather than crowding the labels.
 */
const ACTION_LIFT = 10;

/** The tabs split evenly around the centre action: two left, two right. */
const splitAt = Math.ceil(customerTabs.length / 2);

/**
 * Sticky bottom tab bar with a raised centre action.
 *
 * Padded for the iOS home-indicator via `env(safe-area-inset-bottom)` so the
 * last row is never under the gesture bar.
 *
 * The centre button is positioned off the bar's own top edge by `ACTION_LIFT`,
 * so the amount standing proud is a fixed cap rather than a fraction of a bar
 * height that changes with the device's safe-area inset. The tabs leave a fixed
 * gutter in the middle rather than flowing under it, so nothing is covered.
 */
export function BottomTabBar({
  unread = 0,
  needsAction = 0,
}: {
  /** Unread messages. */
  unread?: number;
  /** Trades waiting on something from this user. */
  needsAction?: number;
}) {
  const pathname = usePathname();
  const counters = { unread, needsAction };

  const renderTab = (tab: TabItem) => {
    const active = isTabActive(tab, pathname);
    const badged = tab.badge ? counters[tab.badge.counter] > 0 : false;

    return (
      <Link
        key={tab.key}
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className="relative flex flex-1 flex-col items-center gap-1 py-1"
      >
        <span className="relative">
          <tab.icon
            aria-hidden="true"
            className={cn("size-[19px]", active ? "text-kumtru-blue" : "text-kumtru-slate-400")}
          />
          {badged ? (
            <span
              className={cn(
                "absolute -top-0.5 -right-1 size-2 rounded-full border-[1.5px] border-card",
                tab.badge?.tone === "risk" ? "bg-kumtru-risk" : "bg-kumtru-success",
              )}
            />
          ) : null}
        </span>
        <span
          className={cn(
            "text-[9px]",
            active ? "font-bold text-kumtru-blue" : "font-medium text-kumtru-slate-400",
          )}
        >
          {tab.label}
        </span>

        {/* The dot is colour only, which a screen reader cannot see. */}
        {badged && tab.badge ? (
          <span className="sr-only">
            {tab.badge.counter === "unread"
              ? `${unread} unread`
              : `${needsAction} needing your attention`}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="relative flex shrink-0 border-t border-border bg-card pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {customerTabs.slice(0, splitAt).map(renderTab)}

      {/* Holds the middle open for the button; not a tab, so not announced. */}
      <span aria-hidden="true" className="shrink-0" style={{ width: ACTION_GUTTER }} />

      {customerTabs.slice(splitAt).map(renderTab)}

      <Link
        href={centerAction.href}
        aria-label={centerAction.label}
        style={{ width: ACTION_SIZE, height: ACTION_SIZE, top: -ACTION_LIFT }}
        className={cn(
          "absolute left-1/2 -translate-x-1/2",
          "flex items-center justify-center rounded-full bg-kumtru-blue text-white",
          "shadow-md shadow-kumtru-blue/30",
          "transition-transform duration-(--animate-duration-fast) active:scale-95",
        )}
      >
        <centerAction.icon aria-hidden="true" className="size-6" strokeWidth={2.5} />
      </Link>
    </nav>
  );
}
