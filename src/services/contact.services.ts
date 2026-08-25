import { useMutation, useQuery } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import {
  STEP_UP_TOKEN_HEADER,
  type AddContactPayload,
  type AddContactResult,
  type ChallengeResult,
  type ContactChannel,
  type ContactIdPayload,
  type EmailChannelRow,
  type PhoneChannelRow,
  type ResendContactPayload,
  type VerifyContactPayload,
} from "@/interfaces/auth";
import http from "@/services/base";

/**
 * The contact-channel endpoints — a second email or phone on an existing account.
 *
 * Written once and switched on `channel` rather than duplicated per endpoint: the
 * API's two families are exactly symmetric (same four verbs, same challenge
 * shape, same 404/409 semantics), and the only real difference is the field name
 * in the create body. Two parallel sets of hooks would be the same code twice,
 * and the place they would drift is the one that matters — the challenge id.
 *
 * Nothing here invalidates a query or touches the auth store. The same
 * `verify` call means "onboarding is finished" in the drawer prompt and "one row
 * changed" in a settings list, so what a result implies is the caller's to
 * decide.
 */

export const contactKeys = {
  all: ["contacts"] as const,
  emails: () => [...contactKeys.all, "emails"] as const,
  phones: () => [...contactKeys.all, "phones"] as const,
  /** Both lists, for invalidating after a change that could move `nextStep`. */
  channel: (channel: ContactChannel) =>
    channel === "EMAIL" ? contactKeys.emails() : contactKeys.phones(),
};

/** The one place the channel becomes a path. */
function basePath(channel: ContactChannel): string {
  return channel === "EMAIL" ? "me/emails" : "me/phones";
}

/* -------------------------------------------------------------------------- */
/* Reading what is already on the account                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every address on the account, verified or not.
 *
 * `enabled` is the caller's, because this is PII the app should only ask for when
 * it is about to show or act on it — not on every mount of a shell that happens
 * to contain a prompt.
 */
export function useEmails(enabled = true) {
  return useQuery<EmailChannelRow[]>({
    queryKey: contactKeys.emails(),
    enabled,
    queryFn: async () => {
      const response = await http.get<IResponse<EmailChannelRow[]>>({ url: "me/emails" });
      return response.data;
    },
  });
}

export function usePhones(enabled = true) {
  return useQuery<PhoneChannelRow[]>({
    queryKey: contactKeys.phones(),
    enabled,
    queryFn: async () => {
      const response = await http.get<IResponse<PhoneChannelRow[]>>({ url: "me/phones" });
      return response.data;
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Adding one                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Creates the row AND sends the first code, in one call.
 *
 * Re-adding a destination that is already on the account returns the existing
 * row and issues a fresh challenge against it, so an abandoned attempt is
 * resumable by simply typing the same address again — no cleanup, no 409.
 *
 * A destination already VERIFIED on somebody else's account is a 409, and that
 * is the one failure worth reading the message for.
 */
export function useAddContact() {
  return useMutation<AddContactResult, unknown, AddContactPayload>({
    mutationFn: async ({ channel, destination, transport }) => {
      const response = await http.post<IResponse<AddContactResult>>({
        url: basePath(channel),
        // The field name IS the contact channel — there is no shared
        // `destination` key — and `channel` in a PHONE body is something else
        // again: the transport the code travels on. It is sent rather than
        // omitted because the API defaults it to SMS.
        body:
          channel === "EMAIL"
            ? { email: destination }
            : { phone: destination, channel: transport ?? "WHATSAPP" },
      });
      return response.data;
    },
  });
}

/**
 * Redeems the code. 200 `{ verified: true }`, and the account's verification
 * level is recomputed server-side — so `GET /me` is stale the moment this
 * resolves.
 */
export function useVerifyContact() {
  return useMutation<{ verified: true }, unknown, VerifyContactPayload>({
    mutationFn: async ({ channel, id, challengeId, code }) => {
      const response = await http.post<IResponse<{ verified: true }>>({
        url: `${basePath(channel)}/${id}/verify`,
        body: { challengeId, code },
      });
      return response.data;
    },
  });
}

/**
 * Issues a new code — and CONSUMES the outstanding one.
 *
 * So the caller must replace its stored `challengeId` with the returned one.
 * Verifying against the old id after a resend fails, which reads to the user as
 * "the code I was just sent does not work".
 *
 * The API allows 3 sends per destination per 10 minutes and answers a fourth
 * with a 429 that names the wait, which is why the button that calls this stays
 * locked for a while after each send.
 *
 * On the phone channel the transport is restated: the API does not remember which
 * route the last code took, and defaults to SMS when not told.
 */
export function useResendContactCode() {
  return useMutation<ChallengeResult, unknown, ResendContactPayload>({
    mutationFn: async ({ channel, id, transport }) => {
      const response = await http.post<IResponse<ChallengeResult>>({
        url: `${basePath(channel)}/${id}/resend`,
        // The email resend validates params only, so it takes no body at all.
        ...(channel === "PHONE" ? { body: { channel: transport ?? "WHATSAPP" } } : {}),
      });
      return response.data;
    },
  });
}

/**
 * Promotes a verified channel to primary. 204, no body.
 *
 * Carries step-up: the primary channel is where security notices and payout
 * confirmations land, so redirecting it is exactly the change an attacker on a
 * borrowed session would make. `stepUpToken` must come from a COMPLETED
 * `EMAIL_CHANGE`/`PHONE_CHANGE` challenge, and it is spent by this request —
 * a retry needs a fresh proof.
 */
export function useMakeContactPrimary() {
  return useMutation<void, unknown, ContactIdPayload & { stepUpToken: string }>({
    mutationFn: async ({ channel, id, stepUpToken }) => {
      await http.post<void>({
        url: `${basePath(channel)}/${id}/make-primary`,
        headers: { [STEP_UP_TOKEN_HEADER]: stepUpToken },
      });
    },
  });
}
