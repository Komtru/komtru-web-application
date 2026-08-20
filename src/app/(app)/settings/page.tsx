"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun } from "lucide-react";

import { InitialsAvatar } from "@/components/general/app/initials-avatar";
import { TabHeader } from "@/components/general/app/screen-header";
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
  const auth = useAuthStore((state) => state.auth);
  const user = useAuthStore((state) => state.user);

  const displayName = user ? `${user.firstName} ${user.lastName}` : "Your account";
  const isDark = resolvedTheme === "dark";

  return (
    <>
      <TabHeader title="Settings" />

      <div className="flex-1 px-4 pt-3 pb-6">
        <div className="mb-3.5 flex items-center gap-3 rounded-kumtru-md border border-border bg-card p-3.5">
          <InitialsAvatar name={displayName} size="lg" tone="success" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{displayName}</p>
            <p className="truncate text-[11px] text-kumtru-slate-500">
              {auth?.verified ? "Email verified" : "Email not verified"}
              {auth?.email ? ` · ${auth.email}` : ""}
            </p>
          </div>
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
          <SettingsRow
            label="Two-step verification"
            hint={auth?.twoFactor.enabled ? "On" : "Off — strongly recommended"}
            trailing={
              <Button asChild variant="ghost" size="icon-sm">
                <Link href="/auth/2fa/setup" aria-label="Set up two-step verification">
                  <SettingsChevron />
                </Link>
              </Button>
            }
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

        <Button asChild variant="secondary" size="xl" className="w-full">
          <Link href="/auth/logout">
            <LogOut className="size-4" />
            Sign out
          </Link>
        </Button>
      </div>
    </>
  );
}
