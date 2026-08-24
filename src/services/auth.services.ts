import { useMutation, useQuery } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import type {
  ForgotPasswordPayload,
  LoginPayload,
  LoginResult,
  LogoutPayload,
  MeResult,
  MfaVerifyPayload,
  ProvidersResult,
  RegisterPayload,
  RegisterResult,
  ResetPasswordPayload,
  SocialAuthorizePayload,
  SocialAuthorizeResult,
  SocialCallbackPayload,
  SocialCallbackResult,
  UpdateProfilePayload,
  UserProfile,
  VerifyOtpPayload,
  VerifyOtpResult,
} from "@/interfaces/auth";
import http from "@/services/base";

/**
 * Identity endpoints, one `use<Verb><Noun>` hook each.
 *
 * Paths are relative to `/api/`, which `next.config.ts` rewrites to
 * `${NEXT_PUBLIC_BASE_URL}` — so `auth/login` here is `POST /v1/auth/login` on
 * the backend, and the browser only ever makes a same-origin request.
 *
 * Nothing in this file reads or writes the auth store. Deciding what a result
 * means for the session is the caller's job, because the same login response
 * means "go to the app" on the sign-in screen and "you are already here" during
 * a step-up.
 */

/** Structured, exported keys so invalidation never guesses at a string. */
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  providers: () => [...authKeys.all, "providers"] as const,
};

/* -------------------------------------------------------------------------- */
/* Registration                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Creates the account and sends the first OTP. Returns no tokens.
 *
 * A user who has not proven control of a channel gets no session — otherwise
 * registering with someone else's email would hand you a live account carrying
 * their address.
 */
export function useRegister() {
  return useMutation<RegisterResult, unknown, RegisterPayload>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<RegisterResult>>({
        url: "auth/register",
        body: payload,
      });
      return response.data;
    },
  });
}

/** Redeems the registration OTP. This is the call that activates the account. */
export function useVerifyOtp() {
  return useMutation<VerifyOtpResult, unknown, VerifyOtpPayload>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<VerifyOtpResult>>({
        url: "auth/verify-otp",
        body: payload,
      });
      return response.data;
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Sign in                                                                    */
/* -------------------------------------------------------------------------- */

/** `identifier` is an email, a phone number or a username — the API resolves it. */
export function useLogin() {
  return useMutation<LoginResult, unknown, LoginPayload>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<LoginResult>>({
        url: "auth/login",
        body: payload,
      });
      return response.data;
    },
  });
}

/** Second leg of a login that came back `mfaRequired`. */
export function useMfaVerify() {
  return useMutation<LoginResult, unknown, MfaVerifyPayload>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<LoginResult>>({
        url: "auth/mfa/verify",
        body: payload,
      });
      return response.data;
    },
  });
}

/** Answers 204. Requires a session, so a revoked token simply fails — harmlessly. */
export function useLogout() {
  return useMutation<void, unknown, LogoutPayload>({
    mutationFn: async (payload) => {
      await http.post<void>({ url: "auth/logout", body: payload });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Password recovery                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Always 202, whatever the identifier.
 *
 * A 404 for an unknown address would make this an account-existence oracle, and
 * it is the one endpoint reachable with no credential at all. The UI must not
 * imply otherwise — see the copy on the confirmation screen.
 */
export function useForgotPassword() {
  return useMutation<{ message?: string }, unknown, ForgotPasswordPayload>({
    mutationFn: async (payload) => {
      return http.post<{ message?: string }>({ url: "auth/password/forgot", body: payload });
    },
  });
}

export function useResetPassword() {
  return useMutation<{ message?: string }, unknown, ResetPasswordPayload>({
    mutationFn: async (payload) => {
      return http.post<{ message?: string }>({ url: "auth/password/reset", body: payload });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Social sign-in                                                             */
/* -------------------------------------------------------------------------- */

/** Which providers this deployment can actually use, so only working buttons render. */
export function useSocialProviders() {
  return useQuery<ProvidersResult>({
    queryKey: authKeys.providers(),
    // The set changes when the backend is redeployed, not while a tab is open.
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const response = await http.get<IResponse<ProvidersResult>>({ url: "auth/providers" });
      return response.data;
    },
  });
}

/**
 * Step one: ask the API for a provider authorization URL, then send the browser to it.
 *
 * A mutation rather than a query on purpose — it has a server-side effect (the
 * PKCE verifier and nonce are stored against `state`), so it must not be
 * prefetched, retried or refetched on focus.
 */
export function useSocialAuthorize() {
  return useMutation<SocialAuthorizeResult, unknown, SocialAuthorizePayload>({
    mutationFn: async ({ provider, mode = "LOGIN", redirectUri }) => {
      const response = await http.get<IResponse<SocialAuthorizeResult>>({
        url: `auth/social/${provider}/authorize`,
        query: { mode, redirectUri },
      });
      return response.data;
    },
  });
}

/** Step two: hand the provider's `code` and `state` back to the API for a session. */
export function useSocialCallback() {
  return useMutation<SocialCallbackResult, unknown, SocialCallbackPayload>({
    mutationFn: async ({ provider, ...body }) => {
      const response = await http.post<IResponse<SocialCallbackResult>>({
        url: `auth/social/${provider}/callback`,
        body,
      });
      return response.data;
    },
  });
}

/* -------------------------------------------------------------------------- */
/* The signed-in user                                                         */
/* -------------------------------------------------------------------------- */

export function useMe(enabled = true) {
  return useQuery<MeResult>({
    queryKey: authKeys.me(),
    enabled,
    queryFn: async () => {
      const response = await http.get<IResponse<MeResult>>({ url: "me" });
      return response.data;
    },
  });
}

/**
 * A partial update: send only the fields that changed.
 *
 * The API takes any subset and requires at least one, and it treats `null` or
 * `""` as "clear this". So an omitted key and an empty one mean genuinely
 * different things, and a form that posts every field on every save will wipe
 * anything it could not prefill — which includes `dateOfBirth` and `gender`,
 * neither of which `GET /me` returns.
 *
 * The response carries the full stored profile, including those two.
 */
export function useUpdateProfile() {
  return useMutation<UserProfile, unknown, UpdateProfilePayload>({
    mutationFn: async (payload) => {
      const response = await http.patch<IResponse<UserProfile>>({
        url: "me/profile",
        body: payload,
      });
      return response.data;
    },
  });
}
