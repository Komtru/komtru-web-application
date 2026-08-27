"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { ProfileAvatar } from "@/components/general/app/profile-avatar";
import { VerificationChip } from "@/components/general/app/verification-chip";
import { Button } from "@/components/ui/button";
import { centerAction, customerTabs, drawerNav, isTabActive } from "@/config/navigation";
import { identityVerificationPrompt, nextStepPrompt } from "@/helpers/auth";
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

      {me ? <VerificationChip level={me.verificationLevel} /> : null}
    </>
  );
}

/**
 * The one nudge, or nothing.
 *
 * At most one shows at a time, and unfinished setup wins: `nextStep` names
 * something that blocks the user today, while identity verification is the next
 * thing worth doing after that. Stacking both would make the more urgent one
 * easier to ignore.
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
  // `me`, not `user`: `setMe` copies only `username` and `status` across, so
  // `user.verificationLevel` is whatever the session was issued with and does
  // not move when the account is verified. This prompt has to disappear the
  // moment that happens.
  const me = useAuthStore((state) => state.me);

  const prompt = nextStepPrompt(nextStep);

  if (!prompt) {
    // Onboarding is done. The account is still short of IDENTITY_VERIFIED, and
    // this is where that gets said — informational, with nothing to tap, since
    // no verification flow exists to tap through to yet.
    const identity = identityVerificationPrompt(me?.verificationLevel);
    if (!identity) return null;

    return (
      <div className={cn(PROMPT_CLASS, "border-kumtru-info/30 bg-kumtru-info-soft")}>
        <p className="text-xs font-semibold text-kumtru-info-on-soft">{identity.title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-kumtru-info-on-soft/80">
          {identity.body}
        </p>
      </div>
    );
  }

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
 * Passing `onPrimaryAction` adds the New trade button at the top. Omitted on a
 * phone, because that action already owns the raised circle in the middle of the
 * tab bar; the desktop rail passes one, since there is no tab bar up there to
 * hold it. It is a handler rather than a link because starting a trade is a
 * dialog, not a destination — see `StartTradeDialog`.
 */
export function SidebarSections({
  onNavigate,
  onPrimaryAction,
}: {
  onNavigate?: () => void;
  onPrimaryAction?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="flex-1 overflow-y-auto p-3">
      {onPrimaryAction ? (
        <Button
          className="mb-3 w-full"
          onClick={() => {
            onNavigate?.();
            onPrimaryAction();
          }}
        >
          <centerAction.icon className="size-4" aria-hidden="true" />
          {centerAction.label}
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
      className={cn(
        ROW_CLASS,
        // The one row whose ink is the hue rather than an on-soft: in dark mode
        // #c0392e is too close to both the rail and its own hover tint, so the
        // dark theme borrows the risk-soft foreground.
        "font-semibold text-kumtru-risk hover:bg-kumtru-risk-soft dark:text-kumtru-risk-on-soft",
      )}
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      Sign out
    </Link>
  );
}

const ROW_CLASS = "flex items-center gap-3 rounded-kumtru-sm px-3 py-2.5 text-[13px] font-medium";

const PROMPT_CLASS =
  "mx-4 mt-4 block rounded-kumtru-md border border-kumtru-warning/30 bg-kumtru-warning-soft p-3";
