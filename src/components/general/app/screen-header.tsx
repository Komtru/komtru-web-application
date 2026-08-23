"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Sticky in-screen top bar: back button, centred title, optional trailing slot.
 * Used on pushed screens (a trade, a dispute) where the tab bar stays put but
 * the user needs a way back up the stack.
 */
export function ScreenHeader({
  title,
  trailing,
  onBack,
  className,
}: {
  title: ReactNode;
  trailing?: ReactNode;
  onBack?: () => void;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3",
        className,
      )}
    >
      <button
        type="button"
        onClick={onBack ?? (() => router.back())}
        aria-label="Go back"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      <span className="truncate text-sm font-semibold">{title}</span>

      <span className="flex size-8 shrink-0 items-center justify-center">{trailing}</span>
    </header>
  );
}

/**
 * There is no `TabHeader` here any more.
 *
 * A root-of-tab header used to render the brand and a bell, which is now exactly
 * what `AppHeader` shows at the top of the shell — so every tab drew a second
 * bar directly under the first. A tab root gets its title as an `<h1>` in the
 * page body instead; `ScreenHeader` above stays, because a pushed screen still
 * needs a way back up the stack.
 */
