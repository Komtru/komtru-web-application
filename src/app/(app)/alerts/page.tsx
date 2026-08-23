"use client";

import { BellOff } from "lucide-react";

import { EmptyState } from "@/components/general/app/empty-state";

/** Alerts tab — frame only. Feed and read-state belong to the Alerts module. */
export default function AlertsPage() {
  return (
    <div className="flex-1 px-4 pt-4 pb-6">
      <h1 className="text-lg font-semibold">Alerts</h1>
      <p className="mt-1 mb-4 text-[11.5px] text-kumtru-slate-500">
        Trade state changes, in order.
      </p>

      <EmptyState
        icon={BellOff}
        title="Nothing to report"
        description="You'll be told when a trade is accepted, funded, dispatched, or when an inspection window is about to close."
      />
    </div>
  );
}
