"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { BrandLockup } from "@/components/general/brand-mark";
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
        "sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3",
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
 * Root-of-tab header: brand lockup (or a plain title) plus a trailing slot.
 * No back button, because a tab root is never pushed onto anything.
 */
export function TabHeader({
  title,
  subtitle,
  trailing,
}: {
  title?: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-2 bg-card px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2.5">
      <div className="min-w-0">
        {title ? (
          <>
            <p className="truncate text-sm font-semibold">{title}</p>
            {subtitle ? (
              <p className="truncate text-[10.5px] text-kumtru-slate-500">{subtitle}</p>
            ) : null}
          </>
        ) : (
          <BrandLockup className="text-sm" />
        )}
      </div>

      {trailing ? <div className="flex shrink-0 items-center gap-1">{trailing}</div> : null}
    </header>
  );
}
