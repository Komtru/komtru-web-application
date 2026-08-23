import type { FactorHint, NextStep, Platform } from "@/interfaces/auth";

/** This is a browser. The API also knows about IOS and ANDROID. */
export const PLATFORM: Platform = "WEB";

/**
 * The terms version recorded against a signup.
 *
 * Sent, stored and auditable — so it is configuration, not a literal buried in a
 * form. Bump it in the environment when the published terms change.
 */
export const TERMS_VERSION = process.env.NEXT_PUBLIC_TERMS_VERSION ?? "2026-08-01";

const DEVICE_KEY = "kumtru-device-id";

/**
 * A stable per-browser id, sent as `deviceFingerprint`.
 *
 * Deliberately a random value we generate once, not a canvas/font fingerprint:
 * the API uses this to recognise a returning device and reduce friction, which a
 * random id does perfectly well, and a real fingerprint would collect far more
 * than that needs.
 */
export function deviceFingerprint(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const generated = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_KEY, generated);

  return generated;
}

/** Where to send someone once they hold a session. */
export const HOME_ROUTE = "/trades";

/**
 * What the API says is still outstanding, in words.
 *
 * `nextStep` never blocks entry to the app — a user with one verified channel
 * can browse and buy — so this is prompt copy, not a redirect.
 */
export function nextStepPrompt(nextStep: NextStep): { title: string; body: string } | null {
  switch (nextStep) {
    case "CHOOSE_USERNAME":
      return {
        title: "Pick your username",
        body: "A handle is how a counterparty tags you into a trade.",
      };
    case "ADD_SECOND_CHANNEL":
      return {
        title: "Add a second contact channel",
        body: "A verified email and phone are what unlock funding a trade.",
      };
    case "SET_PASSWORD":
      return {
        title: "Set a password",
        body: "So you can sign in without waiting for a code.",
      };
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* MFA hand-off                                                               */
/* -------------------------------------------------------------------------- */

export interface PendingMfaChallenge {
  mfaToken: string;
  factors: FactorHint[];
  /** Only for display — "signing in as …". Never sent back. */
  identifier?: string;
}

const MFA_KEY = "kumtru-pending-mfa";

/**
 * The `mfaToken` is carried in `sessionStorage`, not the URL.
 *
 * It is a bearer credential for the second half of a login: in a query string it
 * would land in browser history, in the back/forward cache and in any referrer
 * the next page sends. `sessionStorage` also scopes it to the one tab, which is
 * the right lifetime for a login in progress.
 */
export function stashMfaChallenge(challenge: PendingMfaChallenge): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(MFA_KEY, JSON.stringify(challenge));
}

export function readMfaChallenge(): PendingMfaChallenge | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(MFA_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingMfaChallenge;
  } catch {
    return null;
  }
}

export function clearMfaChallenge(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(MFA_KEY);
}

/* -------------------------------------------------------------------------- */
/* Social sign-in                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Where the provider sends the browser back to.
 *
 * This app's own page, not the API's callback route — that one is a POST, which
 * a browser redirect can never reach. Whatever this resolves to must be
 * registered as an authorised redirect URI with the provider.
 */
export function socialRedirectUri(provider: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100");

  return `${origin}/auth/social/${provider}/callback`;
}
