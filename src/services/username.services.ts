import { useMutation, useQuery } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  type ClaimUsernameResult,
  type UsernameAvailabilityResult,
  type UsernameRejection,
} from "@/interfaces/auth";
import http from "@/services/base";

/**
 * The username endpoints.
 *
 * `GET /usernames/availability` is public and rate-limited at **20 checks per
 * minute per actor**, which is the constraint that shapes the whole UI: the
 * field must debounce, must not fire on input that is locally invalid, and must
 * cache repeat answers. A check-per-keystroke burns the budget in three seconds
 * and then the user gets 429s while typing their own name.
 */

export const usernameKeys = {
  all: ["usernames"] as const,
  availability: (candidate: string) => [...usernameKeys.all, "availability", candidate] as const,
};

/**
 * The API's own format check, mirrored.
 *
 * Not a substitute for the server's answer — it decides reserved namespaces,
 * blocked terms, quarantine and confusability, none of which are knowable here.
 * This exists so a half-typed handle never becomes a request, and so length
 * feedback is instant.
 */
export function checkUsernameFormat(candidate: string): {
  ok: boolean;
  reason?: UsernameRejection;
} {
  if (candidate.length < USERNAME_MIN_LENGTH) return { ok: false, reason: "TOO_SHORT" };
  if (candidate.length > USERNAME_MAX_LENGTH) return { ok: false, reason: "TOO_LONG" };
  if (!USERNAME_PATTERN.test(candidate)) return { ok: false, reason: "INVALID_FORMAT" };
  return { ok: true };
}

/**
 * Is this handle claimable?
 *
 * Pass an already-debounced candidate. `enabled` is the caller's to control, so
 * the query never runs for input the local format check has already rejected.
 */
export function useUsernameAvailability(candidate: string, enabled: boolean) {
  return useQuery<UsernameAvailabilityResult>({
    queryKey: usernameKeys.availability(candidate),
    enabled: enabled && candidate.length > 0,
    // The answer for a given string is stable for as long as anyone is typing,
    // so backtracking over a candidate already checked costs nothing.
    staleTime: 60_000,
    // A 429 is the one failure retrying makes strictly worse.
    retry: false,
    queryFn: async () => {
      const response = await http.get<IResponse<UsernameAvailabilityResult>>({
        url: "usernames/availability",
        query: { username: candidate },
      });
      return response.data;
    },
  });
}

/**
 * First claim. Unrestricted — no cooldown, no cap.
 *
 * Distinct from `PATCH /me/username`, which renames an established handle and
 * carries step-up, a 30-day cooldown, a lifetime cap of three and a block while
 * any trade is live. This one is the onboarding path and has none of that.
 *
 * It re-checks availability inside its own transaction, so a 409 here means the
 * handle went in the gap between the check and the claim — the form has to be
 * able to recover from that, not just disable its button on a stale `available`.
 */
export function useClaimUsername() {
  return useMutation<ClaimUsernameResult, unknown, { username: string }>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<ClaimUsernameResult>>({
        url: "me/username",
        body: payload,
      });
      return response.data;
    },
  });
}
