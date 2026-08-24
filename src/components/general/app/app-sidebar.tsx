"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { BrandLockup } from "@/components/general/brand-mark";
import { ProfileAvatar } from "@/components/general/app/profile-avatar";
import { VerificationChip } from "@/components/general/app/verification-chip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { customerTabs, drawerNav, isTabActive } from "@/config/navigation";
import { nextStepPrompt } from "@/helpers/auth";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

/**
 * The drawer.
 *
 * Slides from the left, over the shell rather than pushing it, so the column
 * width never changes — the tab bar underneath stays exactly where the thumb
 * left it.
 */
export function AppSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const me = useAuthStore((state) => state.me);
  const nextStep = useAuthStore((state) => state.nextStep);

  const displayName =
    me?.profile?.displayName ??
    [me?.profile?.firstName, me?.profile?.lastName].filter(Boolean).join(" ") ??
    "";
  // Falls back through what the API actually guarantees: a username may be null
  // until it is chosen, but `publicId` always exists.
  const heading = displayName || user?.username || user?.publicId || "Your account";
  const prompt = nextStepPrompt(nextStep);

  return (
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

          <div className="flex items-center gap-3">
            <ProfileAvatar url={me?.profile?.avatarUrl} name={heading} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{heading}</p>
              {user?.username ? (
                <p className="truncate text-xs text-kumtru-slate-500">@{user.username}</p>
              ) : null}
            </div>
          </div>

          {user ? <VerificationChip level={user.verificationLevel} /> : null}
        </SheetHeader>

        {prompt ? (
          <Link
            href="/settings"
            onClick={() => onOpenChange(false)}
            className="mx-4 mt-4 block rounded-kumtru-md border border-kumtru-warning/30 bg-kumtru-warning-soft p-3"
          >
            <p className="text-xs font-semibold text-kumtru-warning-on-soft">{prompt.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-kumtru-warning-on-soft/80">
              {prompt.body}
            </p>
          </Link>
        ) : null}

        <nav aria-label="Sections" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {customerTabs.map((tab) => (
              <li key={tab.key}>
                <Link
                  href={tab.href}
                  onClick={() => onOpenChange(false)}
                  aria-current={isTabActive(tab, pathname) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-kumtru-sm px-3 py-2.5 text-[13px] font-medium",
                    isTabActive(tab, pathname)
                      ? "bg-kumtru-blue/10 text-kumtru-blue"
                      : "text-kumtru-slate-600 hover:bg-secondary",
                  )}
                >
                  <tab.icon className="size-4 shrink-0" aria-hidden="true" />
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-5 mb-1 px-3 text-[10px] font-semibold tracking-wide text-kumtru-slate-400 uppercase">
            More
          </p>
          <ul className="space-y-0.5">
            {drawerNav.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 rounded-kumtru-sm px-3 py-2.5 text-[13px] font-medium text-kumtru-slate-600 hover:bg-secondary"
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* A real navigation, not an onClick handler: `/auth/logout` owns
              revocation, cache clearing and the redirect, so there is one way out. */}
          <Link
            href="/auth/logout"
            className="flex items-center gap-3 rounded-kumtru-sm px-3 py-2.5 text-[13px] font-semibold text-kumtru-risk hover:bg-kumtru-risk-soft"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            Sign out
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
