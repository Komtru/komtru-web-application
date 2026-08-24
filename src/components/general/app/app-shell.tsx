"use client";

import { useState, type ReactNode } from "react";

import { AppHeader } from "@/components/general/app/app-header";
import { AppSidebar } from "@/components/general/app/app-sidebar";
import { AppTabBar } from "@/components/general/app/app-tab-bar";
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
 * On a wider screen the same column is simply centred: this app is designed at
 * phone width and never grows a sidebar it would not have on a phone.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { keyboardOpen } = useViewportHeight();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-[var(--app-height,100dvh)] justify-center overflow-hidden bg-kumtru-slate-100 dark:bg-kumtru-navy-deep">
      <div className="flex h-full w-full max-w-[480px] flex-col overflow-hidden border-border bg-background sm:border-x">
        <AppHeader onOpenMenu={() => setMenuOpen(true)} />

        {/* The only scroller in the shell. `overscroll-contain` stops a flick at
            the end of a list from rubber-banding the whole page behind it. */}
        <main className="flex-1 overflow-y-auto overscroll-contain">{children}</main>

        <InstallPrompt />

        {/* Hidden while typing: with the keyboard up, a bar pinned to the visible
            bottom would sit on top of the field. Native apps let it be covered;
            this removes it instead, which is the same outcome without the jump. */}
        {keyboardOpen ? null : <AppTabBar />}
      </div>

      <AppSidebar open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
}
