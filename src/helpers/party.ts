import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/interfaces/auth";
import type { IntendedRole, InviteChannel, LookupChannel, PartyCard } from "@/interfaces/party";
import { TradeRoleEnum } from "@/interfaces/trade";

/**
 * Reading one field three ways.
 *
 * The counterparty field takes a handle, an email or a phone number, because
 * that is what the user has to hand — they know who they are trading with, not
 * which of that person's identifiers this app happens to index. Which of the
 * three it is decides the route (`GET /parties/lookup` vs `POST`), so it has to
 * be settled before the request, locally.
 *
 * Deliberately mirrors `checkDestination` in `helpers/contact.ts` rather than
 * sharing its patterns: that one validates a destination the user is claiming as
 * their own and can be strict, this one classifies a stranger's identifier and
 * must be forgiving — the API normalises and its answer wins.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Loose on formatting, firm on "this is digits, and enough of them to be a number". */
const PHONE_PATTERN = /^\+?[\d][\d\s()-]{6,19}$/;

/**
 * The bounds on a real handle — `USERNAME_*_LENGTH`, not the lookup route's own
 * 1–64. The route would accept two characters and answer honestly that nothing
 * matched, but a handle that short cannot exist, so the request only spends
 * miss-counter budget to learn nothing.
 */
const USERNAME_MIN = USERNAME_MIN_LENGTH;
const USERNAME_MAX = USERNAME_MAX_LENGTH;

/**
 * Which channel this input is, or `null` while it is still too incomplete to
 * tell. `null` is not an error — it is the state of a half-typed field, and the
 * caller should stay quiet rather than complain.
 */
export function detectLookupChannel(raw: string): LookupChannel | null {
  const value = raw.trim();
  if (!value) return null;

  // "Lagos Gadgets Store" is a name, not an identifier — and users will type one
  // here, because the field used to ask for exactly that. No handle, address or
  // number contains an inner space, so this is unambiguous, and catching it
  // locally matters: sent as a username it is a guaranteed miss, and misses are
  // the thing the API counts on its way to a CAPTCHA.
  if (/\s/.test(value)) {
    return PHONE_PATTERN.test(value) ? "PHONE" : null;
  }

  // `@` first: an address contains one, a handle may only lead with one, and a
  // phone number has none. Checked before the digit test so `+2348012345678@…`
  // cannot be read as a number.
  if (value.includes("@") && !value.startsWith("@")) {
    return EMAIL_PATTERN.test(value) ? "EMAIL" : null;
  }

  if (value.startsWith("@")) {
    const handle = value.slice(1);
    return handle.length >= USERNAME_MIN && handle.length <= USERNAME_MAX ? "USERNAME" : null;
  }

  // A bare string of digits is a number, never a handle: the API's username
  // grammar has to start with a letter, so there is no ambiguity to resolve.
  if (/^[+\d]/.test(value)) {
    return PHONE_PATTERN.test(value) ? "PHONE" : null;
  }

  return value.length >= USERNAME_MIN && value.length <= USERNAME_MAX ? "USERNAME" : null;
}

/** What the request should carry: trimmed, and without the `@` the API does not want. */
export function normaliseLookupValue(channel: LookupChannel, raw: string): string {
  const value = raw.trim();
  if (channel === "USERNAME") return value.replace(/^@+/, "");
  if (channel === "PHONE") return value.replace(/[\s()-]/g, "");
  return value;
}

/** A short, honest description of what we are about to search for. */
export function describeLookupChannel(channel: LookupChannel): string {
  if (channel === "USERNAME") return "username";
  if (channel === "EMAIL") return "email address";
  return "phone number";
}

/**
 * The route an invitation to this destination should travel.
 *
 * `SMS` is never chosen. The platform has no working SMS delivery today — see
 * `OtpTransport` — so an SMS invitation is one that silently never arrives.
 * WhatsApp is the only phone route that reaches anyone.
 */
export function inviteChannelFor(channel: Extract<LookupChannel, "EMAIL" | "PHONE">): InviteChannel {
  return channel === "EMAIL" ? "EMAIL" : "WHATSAPP";
}

/** The route, named the way the person waiting for the message would name it. */
export function inviteChannelLabel(channel: InviteChannel): string {
  if (channel === "EMAIL") return "email";
  if (channel === "WHATSAPP") return "WhatsApp";
  return "SMS";
}

/**
 * The counterparty takes the other side. Derived rather than asked: the user has
 * already said which side is theirs at the top of the form, and offering the
 * choice twice is an invitation to contradict yourself.
 */
export function counterpartRole(mine: TradeRoleEnum): IntendedRole {
  return mine === TradeRoleEnum.BUYER ? "SELLER" : "BUYER";
}

/** What to call this account on screen, in the order the user is likeliest to recognise. */
export function partyLabel(party: PartyCard): string {
  return party.displayName ?? (party.username ? `@${party.username}` : party.publicId);
}
