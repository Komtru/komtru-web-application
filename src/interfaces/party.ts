import type { VerificationLevel } from "@/interfaces/auth";

/**
 * Counterparty resolution — `/parties/lookup`, `/parties/suggest`, `/parties/invite`.
 *
 * Kept out of `auth.ts` because none of it describes the signed-in user: this is
 * how one account looks up *another* one before trading with it. The API treats
 * the whole router as directory access and gates it accordingly — see
 * `LOOKUP_MIN_LEVEL`.
 */

/**
 * The minimum verification the API requires to reach ANY lookup route; below it
 * every call is a 403, so the UI has to say why rather than let the user type
 * into a field that cannot answer.
 */
export const LOOKUP_MIN_LEVEL: VerificationLevel = "CONTACT_VERIFIED";

/** What the user typed, classified. The API has a route per channel. */
export type LookupChannel = "USERNAME" | "EMAIL" | "PHONE";

/**
 * The verifications a counterparty has passed, as separate claims.
 *
 * Overlaps `verificationLevel` but is not derivable from it: the level is a
 * ladder, and "has a verified phone" is not a rung on it.
 */
export type PartyBadge =
  | "EMAIL_VERIFIED"
  | "PHONE_VERIFIED"
  | "IDENTITY_VERIFIED"
  | "BUSINESS_VERIFIED"
  | "ENHANCED_DUE_DILIGENCE";

/**
 * The public face of an account — everything the API is willing to tell one user
 * about another, and nothing more.
 *
 * Note there is no `userId`. `publicId` is the only identifier that crosses this
 * boundary, on purpose: the internal id is what appears in `ITrade.participants`
 * and it is not something a lookup should hand out.
 *
 * `completedTransactions`, `isMerchant` and `merchantName` are in the contract
 * but the API's enricher for them is not wired up yet, so they arrive as `0` /
 * `false` / `null` for every account today. Treat a zero here as "unknown", not
 * as "this person has never traded" — rendering it as a track record would be
 * stating a fact the backend has not actually asserted.
 */
export interface PartyCard {
  publicId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  verificationLevel: VerificationLevel;
  badges: PartyBadge[];
  /** `YYYY-MM-DD`. */
  memberSince: string;
  completedTransactions: number;
  isMerchant: boolean;
  merchantName: string | null;
}

/**
 * Found, or deliberately not found.
 *
 * The miss branch carries no hint about what *would* have matched — the API
 * spends the same time and returns the same shape whether the account exists or
 * not, so this is an answer about the caller's own next move, not about whether
 * some address is registered.
 */
export type PartyLookupResult =
  | { found: true; party: PartyCard }
  | {
      found: false;
      /**
       * False for a USERNAME miss: an invitation needs somewhere to deliver to,
       * and a handle that matches no account gives you nothing to send to. The
       * only recovery is to ask for an email or phone instead.
       */
      canInvite: boolean;
      maskedHint: null;
      /** Set after a run of consecutive misses — the API is treating this session as a possible scraper. */
      requiresCaptcha?: boolean;
    };

export interface PartyLookupPayload {
  channel: LookupChannel;
  /** Already trimmed, and with any leading `@` stripped on the USERNAME channel. */
  value: string;
}

/** Prefix-only `@handle` typeahead. Cheaper than a lookup and not part of its miss accounting. */
export interface SuggestedParty {
  publicId: string;
  username: string;
  displayName: string | null;
  verificationLevel: VerificationLevel;
}

/* -------------------------------------------------------------------------- */
/* Invitations                                                                */
/* -------------------------------------------------------------------------- */

/**
 * How an invitation travels. Not `ContactChannel` — that one is `EMAIL | PHONE`,
 * a *kind* of address, whereas this is the delivery route and splits the phone
 * side in two.
 */
export type InviteChannel = "EMAIL" | "SMS" | "WHATSAPP";

/** The side of the trade the invitee is being brought in to take. */
export type IntendedRole = "BUYER" | "SELLER";

export interface InvitePartyPayload {
  channel: InviteChannel;
  destination: string;
  intendedRole: IntendedRole;
  /**
   * The trade this invitation was sent for. `id` is `ITrade.tradeId` — the uuid,
   * not the trade code. The API stores it and echoes it back, which is what lets
   * a claimed invitation be traced to the trade that prompted it.
   */
  context?: { type: "TRANSACTION"; id: string };
}

export interface InvitePartyResult {
  invitationId: string;
  /** Masked (`j•••@gmail.com`). The API will not echo the address back in full. */
  destination: string;
  channel: InviteChannel;
  intendedRole: IntendedRole;
  contextType: string | null;
  contextId: string | null;
  expiresAt: string;
  status: "PENDING" | "CLAIMED" | "EXPIRED" | "CANCELLED";
}

/** A pending invitation the signed-in user sent, from `GET /me/invitations`. */
export interface PartyInvitationRow extends InvitePartyResult {
  createdAt?: string;
  claimedAt?: string | null;
}
