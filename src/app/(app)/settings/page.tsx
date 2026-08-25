"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { LifeBuoy, LogOut, Moon, Pencil, Sun } from "lucide-react";

import { ProfileAvatar } from "@/components/general/app/profile-avatar";
import { VerificationChip } from "@/components/general/app/verification-chip";
import {
  SettingsChevron,
  SettingsGroup,
  SettingsRow,
  SettingsToggle,
} from "@/components/general/app/settings-group";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";

/**
 * Settings tab — frame only.
 *
 * Theme and sign-out work because both are frame concerns. Every row that would
 * write to the API is rendered as navigation for its module to own; none of them
 * pretend to save.
 */
export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const me = useAuthStore((state) => state.me);

  // Falls back through what the API actually guarantees. A profile name is
  // self-declared and often absent; `publicId` always exists.
  const displayName =
    me?.profile?.displayName ||
    [me?.profile?.firstName, me?.profile?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Your account";
  const avatarUrl = me?.profile?.avatarUrl ?? null;
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex-1 px-4 pt-4 pb-6">
      <h1 className="mb-3 text-lg font-semibold">Settings</h1>

      <div className="mb-3.5 rounded-kumtru-md border border-border bg-card p-3.5">
        <div className="flex items-center gap-3">
          <ProfileAvatar url={avatarUrl} name={displayName} size="lg" tone="success" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{displayName}</p>
            <p className="truncate text-[11px] text-kumtru-slate-500">
              {user?.username ? `@${user.username}` : "No username yet"}
            </p>
          </div>
          {user ? <VerificationChip level={user.verificationLevel} className="ms-auto" /> : null}
        </div>

        <Button asChild variant="secondary" size="sm" className="mt-3.5 w-full">
          <Link href="/settings/edit-profile">
            <Pencil className="size-3.5" />
            Edit profile
          </Link>
        </Button>
      </div>

      <SettingsGroup label="Appearance">
        <SettingsRow
          label="Dark mode"
          hint="Follows your device by default"
          trailing={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>
          }
        />
      </SettingsGroup>

      <SettingsGroup label="Security">
        {/* Enrolment lives behind POST /me/mfa/totp/enroll and belongs to the
              account module; rendered as a row rather than a link that 404s. */}
        <SettingsRow
          label="Two-step verification"
          hint={
            me?.mfa.factors.length
              ? `On — ${me.mfa.factors.length} factor${me.mfa.factors.length > 1 ? "s" : ""}`
              : "Off — strongly recommended"
          }
          trailing={<SettingsChevron />}
        />
        <SettingsRow label="Trusted devices" trailing={<SettingsChevron />} />
      </SettingsGroup>

      <SettingsGroup label="Notifications">
        <SettingsRow
          label="Payment protected"
          hint="Not yet configurable"
          trailing={<SettingsToggle label="Payment protected" checked locked />}
        />
        <SettingsRow
          label="Dispute & fraud alerts"
          hint="Always on, every channel"
          trailing={<SettingsToggle label="Dispute and fraud alerts" checked locked />}
        />
      </SettingsGroup>

      <SettingsGroup label="Support">
        {/* The one row in this file that is actually wired rather than a placeholder — M10 built the
            screen it points to, `/help`. It sits here as well as in the drawer's "Get help" row
            (`config/navigation.tsx`): a customer who is already in Settings looking for something
            should not have to back out to the drawer to find it. */}
        <Link href="/help" className="block">
          <SettingsRow
            label="Help & Support"
            hint="Message Komtru about a trade, payment, or your account"
            trailing={
              <span className="flex items-center gap-1.5 text-kumtru-slate-400">
                <LifeBuoy className="size-4" aria-hidden="true" />
                <SettingsChevron />
              </span>
            }
          />
        </Link>
      </SettingsGroup>

      <Button asChild variant="secondary" size="xl" className="w-full">
        <Link href="/auth/logout">
          <LogOut className="size-4" />
          Sign out
        </Link>
      </Button>
    </div>
  );
}
