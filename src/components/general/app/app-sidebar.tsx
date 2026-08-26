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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * The drawer — the phone's copy of the menu.
 *
 * Slides from the left, over the shell rather than pushing it, so the column
 * width never changes — the tab bar underneath stays exactly where the thumb
 * left it. On a desktop the same rows are always on screen instead; see
 * `DesktopSidebar`, which shares the parts in `sidebar-content.tsx`.
 */
export function AppSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [addChannelOpen, setAddChannelOpen] = useState(false);

  const close = () => onOpenChange(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="flex w-[82%] max-w-[320px] flex-col gap-0 p-0"
        >
          <SheetHeader className="gap-3 border-b border-border bg-card px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
            <SheetTitle asChild>
              <BrandLockup className="text-sm" />
            </SheetTitle>
            <SheetDescription className="sr-only">Account menu and navigation</SheetDescription>

            <SidebarIdentity />
          </SheetHeader>

          <SidebarPrompt onNavigate={close} onAddChannel={() => setAddChannelOpen(true)} />

          <SidebarSections onNavigate={close} />

          <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <SidebarSignOut />
          </div>
        </SheetContent>
      </Sheet>

      {/* A sibling of the drawer, not a child: `SheetContent` unmounts when the
          drawer closes, and the drawer has to close for the dialog to be
          reachable on a phone-width screen. */}
      <AddChannelDialog open={addChannelOpen} onOpenChange={setAddChannelOpen} />
    </>
  );
}
