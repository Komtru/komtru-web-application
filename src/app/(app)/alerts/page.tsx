"use client";

import { BellOff } from "lucide-react";

import { EmptyState } from "@/components/general/app/empty-state";
import { TabHeader } from "@/components/general/app/screen-header";

/** Alerts tab — frame only. Feed and read-state belong to the Alerts module. */
export default function AlertsPage() {
  return (
    <>
      <TabHeader title="Alerts" subtitle="Trade state changes, in order" />

      <div className="flex-1 px-4 pt-3 pb-6">
        <EmptyState
          icon={BellOff}
          title="Nothing to report"
          description="You'll be told when a trade is accepted, funded, dispatched, or when an inspection window is about to close."
        />
      </div>
    </>
  );
}
