"use client";

import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/general/app/empty-state";
import { SafetyCallout } from "@/components/general/safety-callout";

/**
 * Trades tab — frame only.
 *
 * The list, filters and trade detail belong to the Trades module and are not
 * built here. `TradeRow` and `TradeTimeline` exist as the composition units that
 * module should render.
 */
export default function TradesPage() {
  return (
    <div className="flex-1 px-4 pt-4 pb-6">
      <h1 className="text-lg font-semibold">Your Trades</h1>
      <p className="mt-1 mb-4 text-[11.5px] text-kumtru-slate-500">
        Everything you are buying, and where each one stands.
      </p>

      <EmptyState
        icon={Inbox}
        title="No trades yet"
        description="When a seller sends you a trade code, look it up here — never through a link they send."
      />

      <SafetyCallout className="mt-4" title="Never pay outside a trade.">
        Komtru will not ask you to send money to a personal account, share a one-time code, or move
        payment to a link.
      </SafetyCallout>
    </div>
  );
}
