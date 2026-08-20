import { useQuery } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import type { ITrade, ListTradesQueryInterface, TradeListResult } from "@/interfaces/trade";
import http from "@/services/base";

/**
 * Read-only trade hooks — the canonical example of the service-layer pattern
 * every module should follow: structured exported keys, a typed `use<Verb><Noun>`
 * hook per endpoint, and `http.*` never reached from a component.
 *
 * Trade mutations (accept, fund, ship, confirm, dispute) belong to the Trades
 * module and are intentionally not implemented here.
 */
export const tradeKeys = {
  all: ["trades"] as const,
  list: (query?: ListTradesQueryInterface) => [...tradeKeys.all, "list", query ?? {}] as const,
  detail: (tradeCode: string) => [...tradeKeys.all, "detail", tradeCode] as const,
};

export function useListTrades(query?: ListTradesQueryInterface) {
  return useQuery<TradeListResult>({
    queryKey: tradeKeys.list(query),
    queryFn: async () => {
      const response = await http.get<IResponse<TradeListResult>>({
        url: "trades",
        query: { ...query },
      });
      return response.data;
    },
  });
}

/**
 * A trade is resolved from a code the user holds, never from an identifier in a
 * link they were sent. `enabled` keeps the query idle until there is a code.
 */
export function useTradeByCode(tradeCode: string | undefined) {
  return useQuery<ITrade>({
    queryKey: tradeKeys.detail(tradeCode ?? ""),
    enabled: Boolean(tradeCode),
    queryFn: async () => {
      const response = await http.get<IResponse<ITrade>>({ url: `trades/${tradeCode}` });
      return response.data;
    },
  });
}
