"use client";

import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/general/app/empty-state";
import { InitialsAvatar } from "@/components/general/app/initials-avatar";
import { TabHeader } from "@/components/general/app/screen-header";
import { useAuthStore } from "@/store/auth.store";

/**
 * Trust Passport tab — frame only.
 *
 * The hero renders identity from the session, which the frame already has. Every
 * number is left to the Trust Passport module: a passport that displays invented
 * figures would be worse than one that displays none.
 */
export default function PassportPage() {
  const auth = useAuthStore((state) => state.auth);
  const user = useAuthStore((state) => state.user);
  const displayName = user ? `${user.firstName} ${user.lastName}` : "Your passport";

  return (
    <>
      <TabHeader />

      <div className="flex-1 px-4 pt-2 pb-6">
        <section className="rounded-kumtru-lg bg-gradient-to-br from-kumtru-navy to-kumtru-slate-800 p-5 text-white">
          <InitialsAvatar name={displayName} size="lg" className="bg-white/15 text-white" />
          <p className="mt-2.5 text-base font-semibold">{displayName}</p>
          <p className="mt-0.5 text-[11px] text-kumtru-slate-400">
            {auth?.verified ? "Verified buyer" : "Verification pending"}
          </p>
        </section>

        <div className="mt-4">
          <EmptyState
            icon={ShieldCheck}
            title="Your record starts with your first trade"
            description="Completions, on-time fulfilment and dispute outcomes are all built from real trades — nothing is self-reported."
          />
        </div>
      </div>
    </>
  );
}
