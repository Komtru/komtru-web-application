import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import type {
  NewTicketPayload,
  ReopenPayload,
  ReplyPayload,
  Ticket,
  TicketDetail,
  TicketMessage,
  TicketStatus,
} from "@/interfaces/tickets";
import http from "@/services/base";

/**
 * M10 (Tickets / Customer Support) — the customer's own conversation.
 *
 * Follows `trade.services.ts`'s shape: structured exported keys, one `use<Verb><Noun>` hook per
 * endpoint, `http.*` never reached from a component. Every mutation here writes to a ticket this user
 * already owns or is creating — there is no admin/staff action anywhere in this file, because this app
 * has no STAFF-scoped session to call one with.
 */
export const ticketKeys = {
  all: ["tickets"] as const,
  list: (status?: TicketStatus) => [...ticketKeys.all, "list", status ?? "any"] as const,
  detail: (id: string) => [...ticketKeys.all, "detail", id] as const,
};

export function useMyTickets(status?: TicketStatus) {
  return useQuery<Ticket[]>({
    queryKey: ticketKeys.list(status),
    queryFn: async () => {
      const response = await http.get<IResponse<Ticket[]>>({
        url: "tickets",
        query: { status },
      });
      return response.data;
    },
  });
}

export function useMyTicket(id: string | undefined) {
  return useQuery<TicketDetail>({
    queryKey: ticketKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await http.get<IResponse<TicketDetail>>({ url: `tickets/${id}` });
      return response.data;
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation<Ticket, unknown, NewTicketPayload>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<Ticket>>({ url: "tickets", body: payload });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useReplyToTicket() {
  const queryClient = useQueryClient();

  return useMutation<TicketMessage, unknown, ReplyPayload>({
    mutationFn: async ({ ticketId, body }) => {
      const response = await http.post<IResponse<TicketMessage>>({
        url: `tickets/${ticketId}/reply`,
        body: { body },
      });
      return response.data;
    },
    onSuccess: (_message, variables) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
    },
  });
}

/**
 * §7's bounded reopen window: the API 409s outside it (14 days past resolution), which the reopen
 * screen surfaces as a normal error rather than hiding the action once `reopenableUntil` has passed —
 * see the comment on that screen for why.
 */
export function useReopenTicket() {
  const queryClient = useQueryClient();

  return useMutation<Ticket, unknown, ReopenPayload>({
    mutationFn: async ({ ticketId, reason }) => {
      const response = await http.post<IResponse<Ticket>>({
        url: `tickets/${ticketId}/reopen`,
        body: { reason },
      });
      return response.data;
    },
    onSuccess: (_ticket, variables) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}
