"use client";

import { useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { REALTIME_EVENTS, type TradeUpdatedPayload } from "@/interfaces/realtime";
import type { ITrade } from "@/interfaces/trade";
import { useSocketEvent } from "@/realtime/socket-provider";
import { tradeKeys } from "@/services/trade.services";

/**
 * Keeps the trade cache in step with the server, live.
 *
 * The backend pushes `trade.updated` to both counterparties on every transition, carrying the same body
 * `GET /trades/:tradeCode` returns. This writes that body into the query cache, so a trade screen that is
 * open repaints with no refetch and a screen that is opened later starts from fresh data.
 *
 * Mounted app-wide rather than on the trade page, for two reasons. The Trades LIST has to react too — a
 * status pill going stale is the same bug in a smaller box — and a page-scoped subscription would drop
 * frames for a trade the user has open in another tab of the same session.
 *
 * No context, no state: this component exists to hold a subscription for the life of the signed-in shell.
 */

export function TradeSync({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const applyTrade = useCallback(
    (trade: ITrade) => {
      queryClient.setQueryData<ITrade>(tradeKeys.detail(trade.tradeCode), (existing) => {
        /**
         * The ordering guard, and the reason the payload carries `version`.
         *
         * Sockets promise delivery, not order, and an HTTP response can also land after the frame for an
         * earlier transition — the mutation hooks write the cache from their own response. `version` is
         * bumped by the backend on every state-changing write, so the newer number always wins and a
         * late frame cannot walk the UI backwards.
         *
         * `>` rather than `>=` on the incoming side: equal versions are the same state, and replacing an
         * identical object would re-render every subscriber for nothing.
         */
        if (existing && existing.version >= trade.version) return existing;
        return trade;
      });

      /**
       * The lists, and NOT `tradeKeys.all`.
       *
       * `all` is a prefix of the detail key, so invalidating it would immediately mark the entry written
       * above as stale and refetch the body the socket just delivered — spending a round-trip to arrive
       * at what we already have. `refetchType: "active"` keeps it to lists actually on screen.
       */
      void queryClient.invalidateQueries({ queryKey: tradeKeys.lists(), refetchType: "active" });
    },
    [queryClient],
  );

  useSocketEvent<TradeUpdatedPayload>(REALTIME_EVENTS.TRADE_UPDATED, (payload) => {
    if (!payload?.tradeCode) return;

    if (payload.trade) {
      applyTrade(payload.trade);
      return;
    }

    /**
     * No body on the frame — refetch instead.
     *
     * Not expected today (the server always sends the trade), but this is the whole fallback: the event
     * plus the code is enough to be correct, it just costs a request. Keeping the branch means the server
     * can slim the frame at any point without a client release.
     */
    void queryClient.invalidateQueries({ queryKey: tradeKeys.detail(payload.tradeCode) });
    void queryClient.invalidateQueries({ queryKey: tradeKeys.lists(), refetchType: "active" });
  });

  return <>{children}</>;
}
