import type { FactorHint, NextStep, Platform, VerificationLevel } from "@/interfaces/auth";

/** This is a browser. The API also knows about IOS and ANDROID. */
export const PLATFORM: Platform = "WEB";

/**
 * `VerificationLevel` is a ladder, and several endpoints state a minimum rung
 * rather than an exact level. The order lives here, next to nothing else that
 * could disagree with it.
 */
const LEVEL_ORDER: readonly VerificationLevel[] = [
  "UNVERIFIED",
  "CONTACT_VERIFIED",
  "IDENTITY_VERIFIED",
  "BUSINESS_VERIFIED",
  "ENHANCED",
];

/**
 * Is this account at or above `minimum`?
 *
 * Mirrors the API's own gate so a screen can explain a 403 before provoking one.
 * It does not replace the gate: the server decides, and an unknown level from a
 * newer API is treated as not meeting the bar rather than as passing it.
 */
export function meetsVerificationLevel(
  level: VerificationLevel | undefined,
  minimum: VerificationLevel,
): boolean {
  const held = level ? LEVEL_ORDER.indexOf(level) : -1;
  return held >= 0 && held >= LEVEL_ORDER.indexOf(minimum);
}

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
/**
 * The nudge that outlives onboarding.
 *
 * `nextStep` goes null once a username, a second channel and a password are all
 * in place — and at that point the sidebar had nothing more to say, even though
 * the account is still only CONTACT_VERIFIED. Verifying identity is the next
 * thing that changes what the user can do, so it gets a standing prompt.
 *
 * Returns copy only, with nowhere to send anyone, because there is nowhere to
 * send them: `IDENTITY_VERIFIED` exists in the API's enum but no endpoint awards
 * it and no module implements a document flow. So this states the value and
 * stops. Give it an href the day that flow ships — not before, because a nudge
 * that leads to a dead end is worse than one that leads nowhere on purpose.
 */
export function identityVerificationPrompt(
  level: VerificationLevel | undefined,
): { title: string; body: string } | null {
  if (!level || meetsVerificationLevel(level, "IDENTITY_VERIFIED")) return null;

  return {
    title: "Verify your identity",
    body: "A verified ID raises your trade limits and shows counterparties who they are dealing with. Opening soon.",
  };
}

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
