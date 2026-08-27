"use client";

import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/general/app/empty-state";
import { ProfileAvatar } from "@/components/general/app/profile-avatar";
import { VerificationChip } from "@/components/general/app/verification-chip";
import { useAuthStore } from "@/store/auth.store";

/**
 * Trust Passport tab — frame only.
 *
 * The hero renders identity from the session, which the frame already has. Every
 * number is left to the Trust Passport module: a passport that displays invented
 * figures would be worse than one that displays none.
 */
export default function PassportPage() {
  const me = useAuthStore((state) => state.me);
  const displayName =
    me?.profile?.displayName ||
    [me?.profile?.firstName, me?.profile?.lastName].filter(Boolean).join(" ") ||
    me?.username ||
    "Your passport";

  return (
    <div className="flex-1 px-4 pt-4 pb-6">
      <section className="rounded-kumtru-lg bg-gradient-to-br from-kumtru-navy to-kumtru-slate-800 p-5 text-white">
        <ProfileAvatar
          url={me?.profile?.avatarUrl}
          name={displayName}
          size="lg"
          className="bg-white/15 text-white"
        />
        <p className="mt-2.5 text-base font-semibold">{displayName}</p>
        {me ? <VerificationChip level={me.verificationLevel} className="mt-1.5" /> : null}
      </section>

      <div className="mt-4">
        <EmptyState
          icon={ShieldCheck}
          title="Your record starts with your first trade"
          description="Completions, on-time fulfilment and dispute outcomes are all built from real trades — nothing is self-reported."
        />
      </div>
    </div>
  );
}
