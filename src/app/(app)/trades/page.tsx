"use client";

import Link from "next/link";
import { Bell, Inbox } from "lucide-react";

import { EmptyState } from "@/components/general/app/empty-state";
import { TabHeader } from "@/components/general/app/screen-header";
import { SafetyCallout } from "@/components/general/safety-callout";
import { Button } from "@/components/ui/button";

/**
 * Trades tab — frame only.
 *
 * The list, filters and trade detail belong to the Trades module and are not
 * built here. `TradeRow` and `TradeTimeline` exist as the composition units that
 * module should render.
 */
export default function TradesPage() {
  return (
    <>
      <TabHeader
        trailing={
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/alerts" aria-label="Alerts">
              <Bell className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="flex-1 px-4 pt-2 pb-6">
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
          Kumtru will not ask you to send money to a personal account, share a one-time code, or
          move payment to a link.
        </SafetyCallout>
      </div>
    </>
  );
}
