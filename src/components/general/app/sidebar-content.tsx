"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { ProfileAvatar } from "@/components/general/app/profile-avatar";
import { VerificationChip } from "@/components/general/app/verification-chip";
import { Button } from "@/components/ui/button";
import { centerAction, customerTabs, drawerNav, isTabActive } from "@/config/navigation";
import { nextStepPrompt } from "@/helpers/auth";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

/**
 * The menu itself, without the thing it sits in.
 *
 * Two chromes, one menu: on a phone these render inside a `Sheet` that slides
 * over the shell, on a desktop inside an `<aside>` that is simply always there.
 * Keeping the parts here means a new row, or a changed active-state rule, lands
 * in both at once — neither copy can quietly drift from the other.
 *
 * Each part reads the store itself rather than taking the user as a prop: there
 * is one signed-in user, both callers would pass the same one, and threading it
 * through only creates a second place for it to go stale.
 */

/** Avatar, name, handle and verification level. */
export function SidebarIdentity() {
  const user = useAuthStore((state) => state.user);
  const me = useAuthStore((state) => state.me);

  const displayName =
    me?.profile?.displayName ??
    [me?.profile?.firstName, me?.profile?.lastName].filter(Boolean).join(" ") ??
    "";
  // Falls back through what the API actually guarantees: a username may be null
  // until it is chosen, but `publicId` always exists.
  const heading = displayName || user?.username || user?.publicId || "Your account";

  return (
    <>
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
    </>
  );
}

/**
 * The one unfinished-setup nudge, or nothing.
 *
 * `ADD_SECOND_CHANNEL` is not a link to settings: which channel is missing is a
 * question only `/me/emails` and `/me/phones` can answer, so the prompt opens
 * the flow that reads them rather than a page that would have to guess.
 */
export function SidebarPrompt({
  onNavigate,
  onAddChannel,
}: {
  onNavigate?: () => void;
  onAddChannel: () => void;
}) {
  const nextStep = useAuthStore((state) => state.nextStep);

  const prompt = nextStepPrompt(nextStep);
  if (!prompt) return null;

  const body = (
    <>
      <p className="text-xs font-semibold text-kumtru-warning-on-soft">{prompt.title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-kumtru-warning-on-soft/80">
        {prompt.body}
      </p>
    </>
  );

  if (nextStep === "ADD_SECOND_CHANNEL") {
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          onAddChannel();
        }}
        className={cn(PROMPT_CLASS, "text-start")}
      >
        {body}
      </button>
    );
  }

  return (
    <Link href="/settings" onClick={onNavigate} className={PROMPT_CLASS}>
      {body}
    </Link>
  );
}

/**
 * The navigation lists: the four tab destinations, then everything else.
 *
 * `primaryAction` adds the New trade button at the top. Off by default, because
 * on a phone that action already owns the raised circle in the middle of the tab
 * bar; the desktop rail turns it on, since there is no tab bar up there to hold
 * it.
 */
export function SidebarSections({
  onNavigate,
  primaryAction = false,
}: {
  onNavigate?: () => void;
  primaryAction?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="flex-1 overflow-y-auto p-3">
      {primaryAction ? (
        <Button asChild className="mb-3 w-full">
          <Link href={centerAction.href} onClick={onNavigate}>
            <centerAction.icon className="size-4" aria-hidden="true" />
            {centerAction.label}
          </Link>
        </Button>
      ) : null}

      <ul className="space-y-0.5">
        {customerTabs.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              onClick={onNavigate}
              aria-current={isTabActive(tab, pathname) ? "page" : undefined}
              className={cn(
                ROW_CLASS,
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
              onClick={onNavigate}
              className={cn(ROW_CLASS, "text-kumtru-slate-600 hover:bg-secondary")}
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * A real navigation, not an onClick handler: `/auth/logout` owns revocation,
 * cache clearing and the redirect, so there is one way out.
 */
export function SidebarSignOut({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/auth/logout"
      onClick={onNavigate}
      className={cn(ROW_CLASS, "font-semibold text-kumtru-risk hover:bg-kumtru-risk-soft")}
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      Sign out
    </Link>
  );
}

const ROW_CLASS = "flex items-center gap-3 rounded-kumtru-sm px-3 py-2.5 text-[13px] font-medium";

const PROMPT_CLASS =
  "mx-4 mt-4 block rounded-kumtru-md border border-kumtru-warning/30 bg-kumtru-warning-soft p-3";
