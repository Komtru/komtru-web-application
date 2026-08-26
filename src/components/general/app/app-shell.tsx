"use client";

import { useState, type ReactNode } from "react";

import { AppHeader } from "@/components/general/app/app-header";
import { AppSidebar } from "@/components/general/app/app-sidebar";
import { AppTabBar } from "@/components/general/app/app-tab-bar";
import { DesktopSidebar } from "@/components/general/app/desktop-sidebar";
import { InstallPrompt } from "@/components/general/pwa/install-prompt";
import { useViewportHeight } from "@/hooks/use-viewport-height";

/**
 * The signed-in shell, laid out as an app rather than as a page.
 *
 * The column is exactly the usable height — `--app-height`, measured from
 * `visualViewport` (see `useViewportHeight`), with `100dvh` as the pre-paint
 * fallback — and does not scroll. Only `<main>` scrolls, so the header stays at
 * the top edge and the tab bar sits snug on the bottom edge of what the browser
 * actually leaves visible, not of the document.
 *
 * Below `lg` that column is centred on its own, phone-width, with the menu
 * behind the hamburger and the four destinations on the bottom bar. From `lg`
 * up it becomes the content pane of an ordinary dashboard: the same menu is
 * pinned open as a rail on the left, the bottom bar goes away — the rail carries
 * those destinations and the New trade action instead — and the pane keeps a
 * readable measure rather than letting a phone-width design stretch across a
 * 27-inch screen.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { keyboardOpen } = useViewportHeight();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-[var(--app-height,100dvh)] justify-center overflow-hidden bg-kumtru-slate-100 dark:bg-kumtru-navy-deep">
      <DesktopSidebar className="hidden lg:flex" />

      <div className="flex h-full w-full max-w-[480px] min-w-0 flex-col overflow-hidden border-border bg-background sm:border-x lg:max-w-none lg:flex-1 lg:border-x-0">
        <AppHeader onOpenMenu={() => setMenuOpen(true)} />

        {/* The only scroller in the shell. `overscroll-contain` stops a flick at
            the end of a list from rubber-banding the whole page behind it. */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {/* `contents` up to `lg`: on a phone this wrapper is not in the layout
              at all, so the column is byte-for-byte what it was before the rail
              existed. It only becomes a box once there is width to centre in. */}
          <div className="contents lg:mx-auto lg:block lg:w-full lg:max-w-3xl">{children}</div>
        </main>

        <InstallPrompt />

        {/* Hidden while typing: with the keyboard up, a bar pinned to the visible
            bottom would sit on top of the field. Native apps let it be covered;
            this removes it instead, which is the same outcome without the jump. */}
        {keyboardOpen ? null : <AppTabBar className="lg:hidden" />}
      </div>

      <AppSidebar open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
}
