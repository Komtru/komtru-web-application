"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { customerTabs, isTabActive } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Sticky bottom tab bar. Padded for the iOS home-indicator via
 * `env(safe-area-inset-bottom)` so the last row is never under the gesture bar.
 */
export function BottomTabBar({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-20 flex border-t border-border bg-card pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {customerTabs.map((tab) => {
        const active = isTabActive(tab, pathname);

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
              {tab.key === "alerts" && unread > 0 ? (
                <span className="absolute -top-0.5 -right-1 size-2 rounded-full border-[1.5px] border-card bg-kumtru-risk" />
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
          </Link>
        );
      })}
    </nav>
  );
}
