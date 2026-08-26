"use client";

import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/general/app/empty-state";
import { SafetyCallout } from "@/components/general/safety-callout";
import { TradeEntryWidget } from "@/components/general/trade/trade-entry-widget";
import { TradeRow } from "@/components/general/trade/trade-row";
import { Spinner } from "@/components/ui/spinner";
import { toErrorMessage } from "@/helpers/errors";
import { getCounterpartyHint } from "@/helpers/counterpartyHints";
import { TradeRoleEnum, type ITrade } from "@/interfaces/trade";
import { useAuthStore } from "@/store/auth.store";
import { useListTrades } from "@/services/trade.services";

/** The other side of the trade from the current viewer's seat, if one has joined yet. */
function counterpartyNameOf(trade: ITrade, viewerId: string | undefined): string {
  const other = trade.participants.find((participant) => participant.userId !== viewerId);
  return other?.displayName || getCounterpartyHint(trade.tradeCode) || "Trade partner";
}

function viewerRoleOf(trade: ITrade, viewerId: string | undefined) {
  return trade.participants.find((participant) => participant.userId === viewerId)?.role;
}

/**
 * Trades tab — "Buy Safely from Any Seller". The entry widget (trade-code
 * lookup, start-a-new-trade, ask-seller-for-code) sits above the trade list;
 * `SafetyCallout` stays underneath everything, same as before.
 */
export default function TradesPage() {
  const viewerId = useAuthStore((state) => state.user?.userId);
  const { data, isLoading, isError, error, refetch } = useListTrades();
  const trades = data?.results ?? [];

  return (
    <div className="flex-1 px-4 pt-4 pb-6">
      <h1 className="text-lg font-semibold">Your Trades</h1>
      <p className="mt-1 mb-4 text-[11.5px] text-kumtru-slate-500">
        Everything you are buying, and where each one stands.
      </p>

      <TradeEntryWidget />

      <SafetyCallout className="mt-4" title="Never pay outside a trade.">
        Komtru will not ask you to send money to a personal account, share a one-time code, or move
        payment to a link.
      </SafetyCallout>

      <div className="mt-5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" className="text-kumtru-blue" />
          </div>
        ) : isError ? (
          <SafetyCallout variant="risk" title="Couldn't load your trades.">
            {toErrorMessage(error, "Something went wrong.")}{" "}
            <button type="button" onClick={() => void refetch()} className="font-semibold underline">
              Try again
            </button>
          </SafetyCallout>
        ) : trades.length > 0 ? (
          <div className="space-y-2.5">
            {trades.map((trade) => {
              const role = viewerRoleOf(trade, viewerId);
              return (
                <TradeRow
                  key={trade.tradeId}
                  tradeCode={trade.tradeCode}
                  amount={trade.financials.amount}
                  currency={trade.financials.currency}
                  status={trade.status}
                  counterpartyName={counterpartyNameOf(trade, viewerId)}
                  summary={
                    role === TradeRoleEnum.SELLER
                      ? `Selling · ${trade.subject.title}`
                      : `Buying · ${trade.subject.title}`
                  }
                  href={`/trades/${trade.tradeCode}`}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Inbox}
            title="No trades yet"
            description="Start a new trade or enter a code a seller sent you — never through a link they send."
          />
        )}
      </div>
    </div>
  );
}
