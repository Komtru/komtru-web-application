"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronLeft, Menu } from "lucide-react";

import { BrandLockup } from "@/components/general/brand-mark";
import { customerTabs } from "@/config/navigation";
import { useNotifications } from "@/realtime/realtime-providers";

/**
 * The shell's top bar: drawer trigger, back, brand, alerts.
 *
 * Fixed at the top of the usable height rather than sticky inside the scroller,
 * so it stays put while a long list moves under it — which is what a native
 * navigation bar does, and what `position: sticky` only approximates once the
 * scroll container is the page itself.
 */
export function AppHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  /**
   * A tab root is the bottom of its own stack — `router.back()` there does not
   * go "up", it leaves the app for whatever the browser was showing before
   * (often the sign-in screen). So the button is rendered on pushed screens
   * only, rather than being shown everywhere and doing something wrong on four
   * of the routes.
   */
  const atTabRoot = customerTabs.some((tab) => tab.href === pathname);

  return (
    <header className="relative flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 lg:px-5">
      <div className="flex items-center">
        {/* Gone from `lg` up: the rail already has every row this would open. */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="flex size-9 items-center justify-center rounded-full text-kumtru-slate-600 active:bg-secondary lg:hidden"
        >
          <Menu className="size-[18px]" aria-hidden="true" />
        </button>

        {atTabRoot ? null : (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex size-8 items-center justify-center rounded-full text-kumtru-slate-600 active:bg-secondary"
          >
            <ChevronLeft className="size-[17px]" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Absolutely centred, so the lockup does not shuffle sideways each time
          the back button appears or disappears between screens. Dropped from
          `lg` up, where the rail carries the brand and a second copy centred
          over the content pane would only read as a stray label. */}
      <BrandLockup className="absolute left-1/2 -translate-x-1/2 text-sm lg:hidden" />

      <Link
        href="/alerts"
        aria-label={unreadCount > 0 ? `Alerts, ${unreadCount} unread` : "Alerts"}
        className="relative flex size-9 items-center justify-center rounded-full text-kumtru-slate-600 active:bg-secondary"
      >
        <Bell className="size-[18px]" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full border-[1.5px] border-card bg-kumtru-risk" />
        ) : null}
      </Link>
    </header>
  );
}
