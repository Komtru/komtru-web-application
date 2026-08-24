"use client";

import { Package } from "lucide-react";

import { EmptyState } from "@/components/general/app/empty-state";
import { SafetyCallout } from "@/components/general/safety-callout";

/**
 * Explore tab — frame only.
 *
 * The listing feed, search and seller pages belong to the Discovery module and
 * are not built here.
 */
export default function ExplorePage() {
  return (
    <div className="flex-1 px-4 pt-4 pb-6">
      <h1 className="text-lg font-semibold">Explore</h1>
      <p className="mt-1 mb-4 text-[11.5px] text-kumtru-slate-500">
        Sellers and listings you can trade for safely.
      </p>

      <EmptyState
        icon={Package}
        title="Nothing to show yet"
        description="Listings from verified sellers will appear here. Until then, look a seller up by their trade code."
      />

      <SafetyCallout className="mt-4" title="Check the passport first.">
        Every seller here carries a Trust Passport. Read it before you agree a price — verification
        level and past trades are the two things a scammer cannot fake.
      </SafetyCallout>
    </div>
  );
}
