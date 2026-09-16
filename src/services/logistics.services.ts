import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import type {
  ILogisticsCompany,
  ILogisticsPackage,
  RequestCourierPackagePayload,
} from "@/interfaces/logistics";
import http from "@/services/base";
import { tradeKeys } from "@/services/trade.services";

export const logisticsKeys = {
  all: ["logistics"] as const,
  couriers: () => [...logisticsKeys.all, "couriers"] as const,
  tradePackage: (tradeCode: string) =>
    [...logisticsKeys.all, "tradePackage", tradeCode.trim().toUpperCase()] as const,
};

export function useAvailableCouriers() {
  return useQuery<ILogisticsCompany[]>({
    queryKey: logisticsKeys.couriers(),
    queryFn: async () => {
      const response = await http.get<IResponse<{ companies: ILogisticsCompany[] }>>({
        url: "me/logistics/companies",
      });
      return response.data?.companies ?? [];
    },
  });
}

export function useTradePackage(tradeCode: string | undefined) {
  return useQuery<ILogisticsPackage | null>({
    queryKey: logisticsKeys.tradePackage(tradeCode ?? ""),
    enabled: Boolean(tradeCode),
    queryFn: async () => {
      const response = await http.get<IResponse<ILogisticsPackage | null>>({
        url: `me/logistics/trades/${tradeCode}/package`,
      });
      return response.data ?? null;
    },
  });
}

export function useRequestCourierPackage() {
  const queryClient = useQueryClient();

  return useMutation<ILogisticsPackage, unknown, RequestCourierPackagePayload>({
    mutationFn: async ({ tradeCode, companyId }) => {
      const response = await http.post<IResponse<ILogisticsPackage>>({
        url: `me/logistics/trades/${tradeCode}/package`,
        body: { companyId },
      });
      return response.data;
    },
    onSuccess: (_pkg, variables) => {
      void queryClient.invalidateQueries({ queryKey: tradeKeys.all });
      void queryClient.invalidateQueries({
        queryKey: logisticsKeys.tradePackage(variables.tradeCode),
      });
    },
  });
}
