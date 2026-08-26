import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import type {
  InvitePartyPayload,
  InvitePartyResult,
  PartyInvitationRow,
  PartyLookupPayload,
  PartyLookupResult,
  SuggestedParty,
} from "@/interfaces/party";
import http from "@/services/base";

/**
 * Counterparty resolution and invitations.
 *
 * The whole `/parties` router sits behind `CONTACT_VERIFIED`, so every hook here
 * can 403 for a reason that is about the caller rather than the request. That is
 * a message worth rendering, not a generic failure.
 *
 * The API rate-limits lookups per user, per device and per IP, and escalates on
 * *consecutive misses*: a CAPTCHA at 20, a suspension of the whole capability at
 * 50. Two consequences run through this file. Lookups are mutations, not
 * queries, so nothing can refetch one on a window focus or a remount. And a
 * failed lookup is never retried — a 429 is the one error where trying again is
 * strictly worse than stopping.
 */

export const partyKeys = {
  all: ["parties"] as const,
  suggest: (query: string) => [...partyKeys.all, "suggest", query] as const,
  invitations: () => [...partyKeys.all, "invitations"] as const,
};

/**
 * Resolve a handle, email or phone number to an account.
 *
 * A mutation despite the username channel being a GET, because this is not a
 * cacheable read: it writes an audit row, publishes a risk event and moves the
 * caller's miss counter. Every call is a deliberate act by the user, and none of
 * them should happen because React re-rendered.
 *
 * The channel picks the route, and the two are not interchangeable. Contacts go
 * by POST so the address stays out of access logs, `Referer` headers and browser
 * history; the API accepts exactly one of `email` / `phone` per request.
 */
export function useLookupParty() {
  return useMutation<PartyLookupResult, unknown, PartyLookupPayload>({
    retry: false,
    mutationFn: async ({ channel, value }) => {
      if (channel === "USERNAME") {
        const response = await http.get<IResponse<PartyLookupResult>>({
          url: "parties/lookup",
          query: { username: value },
        });
        return response.data;
      }

      const response = await http.post<IResponse<PartyLookupResult>>({
        url: "parties/lookup",
        body: channel === "EMAIL" ? { email: value } : { phone: value },
      });
      return response.data;
    },
  });
}

/**
 * `@handle` typeahead — prefix matches only, at most eight, self excluded.
 *
 * Safe to fire while typing in a way `useLookupParty` is not: it is outside the
 * miss accounting, so a half-typed handle costs nothing. It is also not a
 * substitute for a lookup — it never matches an email or a phone number, and it
 * returns less than a `PartyCard`. Confirmation still goes through the lookup.
 *
 * The API requires three characters, so `enabled` stays false below that.
 */
export function useSuggestParties(query: string, enabled = true) {
  return useQuery<SuggestedParty[]>({
    queryKey: partyKeys.suggest(query),
    enabled: enabled && query.length >= 3,
    // A prefix's answer does not move while someone is typing past it, so
    // backtracking over a query already asked costs nothing.
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const response = await http.get<IResponse<SuggestedParty[]>>({
        url: "parties/suggest",
        query: { q: query },
      });
      return response.data;
    },
  });
}

/**
 * Invite someone who has no account yet.
 *
 * Requires the *caller* to have claimed a username — an invitee is told who
 * invited them, and a `publicId` is not an answer to that. A caller without one
 * gets a 403 from this endpoint specifically, while lookups still work.
 *
 * `context` is the only link between an invitation and the trade it was sent
 * for. Passing `ITrade.tradeId` here is what makes a later claim traceable back
 * to this trade, so it should be sent whenever a trade exists to name.
 *
 * Invalidates the sent-invitations list, which is the one cache this changes.
 */
export function useInviteParty() {
  const queryClient = useQueryClient();

  return useMutation<InvitePartyResult, unknown, InvitePartyPayload>({
    retry: false,
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<InvitePartyResult>>({
        url: "parties/invite",
        body: payload,
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: partyKeys.invitations() });
    },
  });
}

/** Invitations this user has sent and that nobody has claimed yet. */
export function usePartyInvitations(enabled = true) {
  return useQuery<PartyInvitationRow[]>({
    queryKey: partyKeys.invitations(),
    enabled,
    queryFn: async () => {
      const response = await http.get<IResponse<PartyInvitationRow[]>>({ url: "me/invitations" });
      return response.data;
    },
  });
}

/** Withdraw one. The destination stops being a pending claim on the trade it named. */
export function useCancelPartyInvitation() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { id: string }>({
    mutationFn: async ({ id }) => {
      await http.delete<void>({ url: `me/invitations/${id}` });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: partyKeys.invitations() });
    },
  });
}
