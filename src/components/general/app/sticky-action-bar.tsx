import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The primary-action footer from the screens guide: sits above the tab bar,
 * fades the content behind it rather than cutting it off, and stacks buttons
 * vertically so the destructive/secondary choice is never a thumb-slip away
 * from the irreversible one.
 */
export function StickyActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 mt-auto flex flex-col gap-2 bg-gradient-to-t from-card from-70% to-transparent px-4 pt-6 pb-3.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
