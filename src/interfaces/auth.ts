/**
 * Identity contracts, mirrored from `backend-apis/src/modules/identity`.
 *
 * Every name here matches what the API actually sends. Where the backend has one
 * public name for a value (`memberSince`, not `createdAt`), so does this file —
 * a second name for the same field is how the two sides drift apart.
 */

/* -------------------------------------------------------------------------- */
/* Enums — string unions, because that is what the wire carries                */
/* -------------------------------------------------------------------------- */

/** Registration proves control of ONE channel. The second is added later. */
export type RegistrationChannel = "EMAIL" | "PHONE";

export type Platform = "IOS" | "ANDROID" | "WEB";

export type UserStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "RESTRICTED"
  | "SUSPENDED"
  | "LOCKED"
  | "CLOSED"
  | "ANONYMISED";

export type VerificationLevel =
  "UNVERIFIED" | "CONTACT_VERIFIED" | "IDENTITY_VERIFIED" | "BUSINESS_VERIFIED" | "ENHANCED";

/**
 * What onboarding should ask for next. The API computes it so the client never
 * has to infer it from a scattering of booleans.
 *
 * Ordered by how much it blocks: no username means the user cannot be tagged or
 * sell at all; one verified channel still allows browsing and buying.
 */
export type NextStep = "CHOOSE_USERNAME" | "ADD_SECOND_CHANNEL" | "SET_PASSWORD" | null;

/** Lowercase on the wire — it is a URL segment (`/auth/social/google/...`). */
export type SocialProviderSlug = "google" | "apple" | "facebook";

/** Uppercase on the wire — it is a value, not a path. */
export type SocialProvider = "GOOGLE" | "APPLE" | "FACEBOOK";

export type FactorType = "TOTP" | "SMS_OTP" | "EMAIL_OTP" | "PASSKEY" | "RECOVERY_CODE";

export type CapabilityCode = "SELLER" | "MERCHANT_MEMBER" | "STAFF";

/* -------------------------------------------------------------------------- */
/* Password policy — mirrors domain/credential/policy.ts                       */
/* -------------------------------------------------------------------------- */

/**
 * Length only, no composition rules.
 *
 * Forced symbols produce `Password1!` at scale, which is in every breach corpus;
 * the API checks the real thing (a breach corpus and an entropy floor) and says
 * why in its 400. Mirroring that check here would only ever be a weaker copy, so
 * the client validates length and lets the API own the rest.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 256;

/* -------------------------------------------------------------------------- */
/* Username policy — mirrors domain/username/policy.ts                         */
/* -------------------------------------------------------------------------- */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/**
 * A letter, then 1–28 characters where a separator is only legal when the next
 * character is alphanumeric, then an alphanumeric. That is what forbids `a__b`,
 * `a._b` and a trailing dot or underscore.
 *
 * Copied verbatim from the API's authoritative regex, and lowercase-only:
 * ASCII-only is the launch decision, and it removes the whole homoglyph class
 * before it reaches the server's skeleton folder. A digits-only handle is
 * impossible by construction, which keeps a username from being mistaken for a
 * `publicId` or a phone number.
 *
 * Mirrored here only to avoid a round-trip on input that cannot possibly be
 * valid — the API still decides, and its answer wins.
 */
export const USERNAME_PATTERN = /^[a-z](?:[a-z0-9]|[._](?=[a-z0-9])){1,28}[a-z0-9]$/;

/** Why a requested handle was refused. Mirrors `reason` on the availability response. */
export type UsernameRejection =
  | "INVALID_FORMAT"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "RESERVED"
  | "TAKEN"
  | "CONFUSABLE_WITH_EXISTING"
  | "QUARANTINED"
  | "BLOCKED_TERM";

export interface UsernameAvailabilityResult {
  available: boolean;
  reason?: UsernameRejection;
  /** Present only when unavailable, and every one is pre-verified as claimable. */
  suggestions?: string[];
}

export interface ClaimUsernameResult {
  username: string;
  usernameSetAt: string;
}

/* -------------------------------------------------------------------------- */
/* Entities                                                                   */
/* -------------------------------------------------------------------------- */

/** A second factor, described well enough to pick between — never enough to use. */
export interface FactorHint {
  id: string;
  type: FactorType;
  hint: string;
  isDefault: boolean;
}

/** The user block every session-issuing endpoint returns. Deliberately small. */
export interface UserSummary {
  userId: string;
  publicId: string;
  username: string | null;
  status: UserStatus;
  verificationLevel: VerificationLevel;
  memberSince: string;
}

export interface UserProfile {
  displayName: string | null;
  /**
   * Self-declared, and NOT verified legal identity — that lives behind identity
   * verification (M6), which is a different module and a different assurance.
   * Nothing here should imply the platform has checked this name.
   */
  firstName: string | null;
  lastName: string | null;
  /**
   * An uploaded photo wins; a social provider's picture is the fallback.
   *
   * Resolved fresh on every `GET /me` because the signed URL expires — treat it
   * as short-lived and re-read rather than caching it. `avatarExpiresAt` is null
   * when the URL does not expire.
   */
  avatarUrl: string | null;
  avatarExpiresAt: string | null;
  avatarFileId: string | null;
  bio: string | null;
  /**
   * NOT returned by `GET /me`. Both are writable through `PATCH /me/profile`
   * and come back on its response, but the profile block the app reads on load
   * omits them — so an edit form cannot prefill either, and must not send an
   * empty value for one it never read.
   */
  dateOfBirth?: string | null;
  gender?: string | null;
}

/**
 * Every field is optional and at least one is required — the API rejects an
 * empty body rather than recording an update that changed nothing.
 *
 * `null` and `""` both clear a field. That is the difference that matters when
 * building the payload: omitting a key leaves the stored value alone, sending an
 * empty one wipes it.
 */
export interface UpdateProfilePayload {
  displayName?: string | null;
  /**
   * Accepted by the API, but this app does not write either.
   *
   * A legal name a user types about themselves is an assertion, not a fact, and
   * on a payments platform the difference is the whole point — the real values
   * come from identity verification. They are still READ (a social sign-up
   * populates them from the provider), just never edited by hand.
   */
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  /** ISO 8601. */
  dateOfBirth?: string | null;
  gender?: string | null;
  /**
   * A finalized `PROFILE_PHOTO` file id — never a URL.
   *
   * `avatarUrl` used to be writable here and is not any more: an arbitrary
   * user-controlled URL rendered in every counterparty's browser is a tracking
   * pixel and a hotlink. `null` clears the uploaded photo.
   */
  avatarFileId?: string | null;
}

export interface PrivacySettings {
  discoverableByUsername: boolean;
  discoverableByEmail: boolean;
  discoverableByPhone: boolean;
  marketingOptIn: boolean;
}

/** `GET /me` — the one place the API returns PII, and only to its owner. */
export interface MeResult {
  userId: string;
  publicId: string;
  username: string | null;
  status: UserStatus;
  verificationLevel: VerificationLevel;
  badges: string[];
  profile: UserProfile | null;
  capabilities: CapabilityCode[];
  mfa: { required: boolean; enrolledAt: string | null; factors: FactorHint[] };
  privacy: PrivacySettings;
  locale: string | null;
  timezone: string | null;
  memberSince: string;
  nextStep: NextStep;
}

/* -------------------------------------------------------------------------- */
/* Session                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The tokens half of a session response.
 *
 * `expiresIn` is seconds, and applies to the ACCESS token only. The refresh
 * token is also set as an HttpOnly cookie by the API, but that cookie is scoped
 * to `/v1/auth` on the API's own origin — this app proxies through `/api`, so it
 * sends the refresh token in the body and keeps its own copy.
 */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export interface SessionResult extends SessionTokens {
  user: UserSummary;
  nextStep: NextStep;
  /** Present on the social callback only. */
  isNewUser?: boolean;
}

/** Login stopped short of a session: prove a second factor to finish. */
export interface MfaChallengeResult {
  mfaRequired: true;
  mfaToken: string;
  factors: FactorHint[];
}

export type LoginResult = MfaChallengeResult | SessionResult;

/**
 * The two branches carry no shared discriminant field — a successful login has
 * no `mfaRequired: false`, it simply has tokens. So the guard tests for the flag
 * rather than switching on it.
 */
export function isMfaChallenge(result: LoginResult): result is MfaChallengeResult {
  return (result as MfaChallengeResult).mfaRequired === true;
}

/* -------------------------------------------------------------------------- */
/* Payloads                                                                   */
/* -------------------------------------------------------------------------- */

export interface RegisterPayload {
  channel: RegistrationChannel;
  /** Required on the EMAIL channel and FORBIDDEN on the other — the API 400s on both. */
  email?: string;
  phone?: string;
  /** Optional on the PHONE path: a phone-first user sets a password after verifying. */
  password?: string;
  acceptedTermsVersion: string;
  acceptedPrivacyVersion?: string;
  marketingOptIn: boolean;
  invitationToken?: string;
}

export interface RegisterResult {
  userId: string;
  publicId: string;
  status: UserStatus;
  /** Redeem this with the code from the email or SMS. No session exists yet. */
  challengeId: string;
  nextStep: "VERIFY_EMAIL" | "VERIFY_PHONE";
}

export interface VerifyOtpPayload {
  challengeId: string;
  code: string;
  deviceFingerprint?: string;
  platform?: Platform;
}

/** Verifying the first channel is what activates the account, so a session comes back. */
export interface VerifyOtpResult extends Partial<SessionTokens> {
  verified: boolean;
  nextStep: NextStep;
  user: UserSummary;
}

export interface LoginPayload {
  /** One field for email, phone or username — the failure response is uniform either way. */
  identifier: string;
  password: string;
  deviceFingerprint?: string;
  platform?: Platform;
}

export interface MfaVerifyPayload {
  mfaToken: string;
  factorId: string;
  /** Six digits for a TOTP or OTP factor; longer for a recovery code. */
  code: string;
  challengeId?: string;
}

export interface RefreshPayload {
  refreshToken?: string;
}

export interface LogoutPayload {
  refreshToken?: string;
  allDevices?: boolean;
}

export interface ForgotPasswordPayload {
  identifier: string;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface SocialAuthorizePayload {
  provider: SocialProviderSlug;
  mode?: "LOGIN" | "LINK";
  /**
   * Where the provider sends the browser back to.
   *
   * This app must supply its own, because the API's default points at its own
   * `POST /v1/auth/social/:provider/callback` — a route a browser redirect can
   * never reach. The value has to be registered with the provider.
   */
  redirectUri?: string;
}

export interface SocialAuthorizeResult {
  authorizationUrl: string;
  state: string;
}

export interface SocialCallbackPayload {
  provider: SocialProviderSlug;
  code: string;
  state: string;
  /** Apple posts the name and email in the form body, on the FIRST authorisation only. */
  user?: { name?: { firstName?: string; lastName?: string }; email?: string };
}

/** A callback can sign you in, link a provider to a session you already had, or ask for proof first. */
export type SocialCallbackResult =
  SessionResult | { linked: true; provider: string; isNewUser: false };

export function isSocialLinkResult(
  result: SocialCallbackResult,
): result is { linked: true; provider: string; isNewUser: false } {
  return (result as { linked?: boolean }).linked === true;
}

export interface ProvidersResult {
  providers: SocialProvider[];
}

/**
 * A provider already attached to this account, from `GET /me/social-identities`.
 *
 * The presence of a row IS the "this account may sign in with this provider"
 * permission — there is no separate flag. The API keys it on the provider's
 * subject id rather than on the email, so a row survives the user changing their
 * address at Google, and an unlinked row is excluded rather than returned with a
 * status.
 */
export interface SocialIdentityRow {
  provider: SocialProvider;
  providerUsername: string | null;
  linkedAt: string;
  /** Null until the provider has actually been used to sign in. */
  lastUsedAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* Contact channels                                                           */
/* -------------------------------------------------------------------------- */

/**
 * `/me/emails` and `/me/phones` are deliberately symmetric — same four verbs,
 * same challenge shape — so most of this module is written once and switched on
 * this union rather than duplicated per endpoint.
 */
export type ContactChannel = "EMAIL" | "PHONE";

export interface EmailChannelRow {
  id: string;
  email: string;
  /** Safe to render anywhere. The full address is only ever returned to its owner. */
  masked: string;
  verified: boolean;
  isPrimary: boolean;
  addedAt: string;
}

export interface PhoneChannelRow {
  id: string;
  phone: string;
  masked: string;
  verified: boolean;
  isPrimary: boolean;
  /**
   * SIM-recycling defence: a verified number unused for a year has to prove
   * itself again. Null until the number is verified.
   */
  reverifyAfter: string | null;
  addedAt: string;
}

export type ContactChannelRow = EmailChannelRow | PhoneChannelRow;

/** Adding a channel also sends the first code, so the challenge comes back with the id. */
export interface AddContactResult {
  id: string;
  verified: false;
  challengeId: string;
  /** Echoed on the phone channel, so the UI can name the route the code took. */
  channel?: OtpTransport;
}

/** A resend mints a NEW challenge and consumes the old one — this id replaces it. */
export interface ChallengeResult {
  challengeId: string;
  channel?: OtpTransport;
}

export interface AddContactPayload {
  channel: ContactChannel;
  /** An address on the EMAIL channel, an E.164-ish number on the other. */
  destination: string;
  /** PHONE only, and it must be sent — see `OtpTransport`. */
  transport?: OtpTransport;
}

export interface VerifyContactPayload {
  channel: ContactChannel;
  id: string;
  challengeId: string;
  code: string;
}

export interface ContactIdPayload {
  channel: ContactChannel;
  id: string;
}

export interface ResendContactPayload extends ContactIdPayload {
  /**
   * A resend states its own transport rather than repeating the one used when the
   * number was added — nothing is stored per phone about the last route used, and
   * "try WhatsApp instead" is the most useful thing a user can do about a code
   * that never arrived.
   */
  transport?: OtpTransport;
}

/**
 * How a phone OTP travels, on the wire as `channel`.
 *
 * **Must be sent explicitly.** The API defaults this to `SMS`, so omitting it is
 * not "let the server decide" — it is choosing the one transport this platform
 * cannot currently deliver, and the user waits for a text that never comes while
 * the screen says WhatsApp.
 *
 * `VOICE` is in the API's `otp_channel` enum for a future read-aloud path but has
 * no message template, so these two are the only real options.
 */
export type OtpTransport = "WHATSAPP" | "SMS";

/* -------------------------------------------------------------------------- */
/* Step-up                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Actions that need proof of a PRESENT authentication, not just a live session.
 *
 * Mirrored from `STEP_UP_ACTIONS` on the API. Every one either moves money,
 * changes where money goes, or changes how the account is recovered — which is
 * why promoting a contact channel to primary is on the list.
 */
export type StepUpAction =
  | "PASSWORD_CHANGE"
  | "EMAIL_CHANGE"
  | "PHONE_CHANGE"
  | "MFA_REMOVAL"
  | "PAYOUT_ACCOUNT_CHANGE"
  | "USERNAME_CHANGE"
  | "SOCIAL_UNLINK"
  | "SELLER_ACTIVATION"
  | "DEVICE_TRUST"
  | "ACCOUNT_CLOSURE"
  | "SOCIAL_LINK_CONFIRM";

export type StepUpMethod = "PASSWORD" | "TOTP" | "EMAIL_OTP" | "SMS_OTP" | "PASSKEY";

/**
 * The header the proof is presented on.
 *
 * A header rather than a body field so it composes with any route shape — and it
 * is CONSUMED by the action, so one proof authorises exactly one request.
 */
export const STEP_UP_TOKEN_HEADER = "X-Step-Up-Token";

export interface BeginStepUpPayload {
  action: StepUpAction;
  method: StepUpMethod;
}

export interface StepUpChallenge {
  stepUpToken: string;
  /** Set only for the methods that deliver a code — null for PASSWORD, TOTP, PASSKEY. */
  challengeId: string | null;
  methods: string[];
}

export interface CompleteStepUpPayload {
  stepUpToken: string;
  /** The password, the TOTP code or the delivered OTP — whichever the method asked for. */
  proof: string;
  /** TOTP only. */
  factorId?: string;
}

/**
 * The token is echoed back because the CALLER now spends it on the real action.
 * Splitting proof from act is what avoids a window where the proof is used up
 * but nothing happened.
 */
export interface CompleteStepUpResult {
  verified: true;
  action: StepUpAction;
  stepUpToken: string;
}

/* -------------------------------------------------------------------------- */
/* Store contract                                                             */
/* -------------------------------------------------------------------------- */

export interface AuthState {
  accessToken?: string;
  refreshToken?: string;
  /** Epoch ms. Derived from `expiresIn` at issue time, so it survives a reload. */
  accessExpiresAt?: number;
  user: UserSummary | null;
  /** The richer `GET /me` view, cached so the shell can render a name and avatar. */
  me: MeResult | null;
  nextStep: NextStep;
  hydrated: boolean;
}

export interface AuthStore extends AuthState {
  startSession: (session: SessionResult) => void;
  setTokens: (tokens: SessionTokens) => void;
  setUser: (user: UserSummary) => void;
  setMe: (me: MeResult) => void;
  setNextStep: (nextStep: NextStep) => void;
  setHydrated: () => void;
  logout: () => void;
}
