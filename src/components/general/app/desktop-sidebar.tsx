"use client";

import { useState } from "react";

import { AddChannelDialog } from "@/components/general/app/add-channel-dialog";
import { BrandLockup } from "@/components/general/brand-mark";
import {
  SidebarIdentity,
  SidebarPrompt,
  SidebarSections,
  SidebarSignOut,
} from "@/components/general/app/sidebar-content";
import { cn } from "@/lib/utils";

/**
 * The always-there rail, for screens with room for one.
 *
 * Same rows as the drawer (`AppSidebar`), same order, no hamburger in front of
 * them: at desktop width the menu is cheap to keep on screen, so hiding it
 * behind a tap only costs a click. It also takes over the New trade action,
 * which on a phone lives in the middle of the tab bar — there is no tab bar up
 * here to hold it.
 *
 * Rendered by `AppShell` with `hidden lg:flex`, so on a phone it is never in the
 * tree's way; the drawer covers that width instead.
 */
export function DesktopSidebar({ className }: { className?: string }) {
  const [addChannelOpen, setAddChannelOpen] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "h-full w-[264px] shrink-0 flex-col border-r border-border bg-card xl:w-[288px]",
          className,
        )}
      >
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4">
          <BrandLockup className="text-sm" />
          <SidebarIdentity />
        </div>

        <SidebarPrompt onAddChannel={() => setAddChannelOpen(true)} />

        <SidebarSections primaryAction />

        <div className="border-t border-border p-3">
          <SidebarSignOut />
        </div>
      </aside>

      <AddChannelDialog open={addChannelOpen} onOpenChange={setAddChannelOpen} />
    </>
  );
}
