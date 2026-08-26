import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import type {
  AcceptTradePayloadInterface,
  ConfirmDeliveryPayloadInterface,
  CreateTradePayloadInterface,
  FundTradePayloadInterface,
  ITrade,
  ListTradesQueryInterface,
  RaiseDisputePayloadInterface,
  ShipTradePayloadInterface,
  TradeListResult,
} from "@/interfaces/trade";
import http from "@/services/base";

/**
 * The service-layer pattern every module should follow: structured exported keys,
 * a typed `use<Verb><Noun>` hook per endpoint, and `http.*` never reached from a
 * component.
 *
 * Every mutation below invalidates `tradeKeys.all` (the list) alongside the
 * specific trade's detail key — a single trade action here routinely changes
 * both what the Trades tab list shows (status pill, summary line) and the
 * detail screen, and this module's mutation volume does not justify hand-tuned
 * per-field invalidation the way a hot path would.
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

/** Warms both caches after any mutation that returns the trade's new state. */
function primeTradeCaches(queryClient: ReturnType<typeof useQueryClient>, trade: ITrade) {
  queryClient.setQueryData(tradeKeys.detail(trade.tradeCode), trade);
  void queryClient.invalidateQueries({ queryKey: tradeKeys.all });
}

/**
 * Creates the trade and mints its `tradeCode` — the code the initiator shares
 * with their counterpart out-of-band (Instagram, WhatsApp, Twitter DM) so the
 * counterpart can look it up and redeem it. Works identically whether `role` is
 * buyer or seller; the account model has no separate "become a seller" step,
 * capacity is checked live by the backend on this call.
 */
export function useCreateTrade() {
  const queryClient = useQueryClient();

  return useMutation<ITrade, unknown, CreateTradePayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<ITrade>>({ url: "trades", body: payload });
      return response.data;
    },
    onSuccess: (trade) => primeTradeCaches(queryClient, trade),
  });
}

/**
 * The counterpart's side of the code hand-off: no body, the calling user simply
 * becomes the bound participant. Distinct from `useTradeByCode`, which only
 * looks a trade up — this is the step that actually joins it.
 */
export function useRedeemTrade() {
  const queryClient = useQueryClient();

  return useMutation<ITrade, unknown, { tradeCode: string }>({
    mutationFn: async ({ tradeCode }) => {
      const response = await http.post<IResponse<ITrade>>({ url: `trades/${tradeCode}/redeem` });
      return response.data;
    },
    onSuccess: (trade) => primeTradeCaches(queryClient, trade),
  });
}

export function useAcceptTrade() {
  const queryClient = useQueryClient();

  return useMutation<ITrade, unknown, AcceptTradePayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<ITrade>>({
        url: `trades/${payload.tradeCode}/accept`,
        body: payload,
      });
      return response.data;
    },
    onSuccess: (trade) => primeTradeCaches(queryClient, trade),
  });
}

export function useFundTrade() {
  const queryClient = useQueryClient();

  return useMutation<ITrade, unknown, FundTradePayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<ITrade>>({
        url: `trades/${payload.tradeCode}/fund`,
        body: payload,
      });
      return response.data;
    },
    onSuccess: (trade) => primeTradeCaches(queryClient, trade),
  });
}

export function useShipTrade() {
  const queryClient = useQueryClient();

  return useMutation<ITrade, unknown, ShipTradePayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<ITrade>>({
        url: `trades/${payload.tradeCode}/ship`,
        body: payload,
      });
      return response.data;
    },
    onSuccess: (trade) => primeTradeCaches(queryClient, trade),
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();

  return useMutation<ITrade, unknown, ConfirmDeliveryPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<ITrade>>({
        url: `trades/${payload.tradeCode}/confirm`,
        body: payload,
      });
      return response.data;
    },
    onSuccess: (trade) => primeTradeCaches(queryClient, trade),
  });
}

export function useRaiseDispute() {
  const queryClient = useQueryClient();

  return useMutation<ITrade, unknown, RaiseDisputePayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<ITrade>>({
        url: `trades/${payload.tradeCode}/dispute`,
        body: payload,
      });
      return response.data;
    },
    onSuccess: (trade) => primeTradeCaches(queryClient, trade),
  });
}

/**
 * Lower priority per the proposed contract — `POST /trades/:tradeCode/cancel`
 * "may or may not exist yet." Built defensively: a 404/501 here surfaces
 * through the same `toErrorMessage` path as any other failure, with no special
 * casing. Remove this comment once the endpoint is confirmed live.
 */
export function useCancelTrade() {
  const queryClient = useQueryClient();

  return useMutation<ITrade, unknown, { tradeCode: string }>({
    mutationFn: async ({ tradeCode }) => {
      const response = await http.post<IResponse<ITrade>>({
        url: `trades/${tradeCode}/cancel`,
        body: { tradeCode },
      });
      return response.data;
    },
    onSuccess: (trade) => primeTradeCaches(queryClient, trade),
  });
}
