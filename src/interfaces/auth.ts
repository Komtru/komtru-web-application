/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export enum AccountRoleEnum {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  SUPPORT = "support",
}

export enum AccountStatusEnum {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  CLOSED = "closed",
}

export enum AuthProviderEnum {
  PASSWORD = "password",
  GOOGLE = "google",
  APPLE = "apple",
}

export enum TwoFactorMethodEnum {
  AUTHENTICATOR = "authenticator",
  EMAIL = "email",
}

/* -------------------------------------------------------------------------- */
/* Entities — credentials and profile are two linked records, never one blob.  */
/* -------------------------------------------------------------------------- */

export interface ITwoFactor {
  enabled: boolean;
  method?: TwoFactorMethodEnum;
  verifiedAt?: string;
}

export interface IAuth {
  id: string;
  email: string;
  phone?: string;
  provider: AuthProviderEnum;
  role: AccountRoleEnum;
  status: AccountStatusEnum;
  verified: boolean;
  twoFactor: ITwoFactor;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IUserPreferences {
  timezone?: string;
  locale?: string;
  currency?: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface IUser {
  id: string;
  authId: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  country?: string;
  preferences: IUserPreferences;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Tokens                                                                     */
/* -------------------------------------------------------------------------- */

export interface TokenPayload {
  token: string;
  expires: string;
}

export interface Access {
  access: TokenPayload;
  refresh: TokenPayload;
}

/* -------------------------------------------------------------------------- */
/* Payloads                                                                   */
/* -------------------------------------------------------------------------- */

export interface LoginPayloadInterface {
  email: string;
  password: string;
  recaptchaToken?: string;
}

export interface RegisterPayloadInterface {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  acceptedTerms: boolean;
  recaptchaToken?: string;
}

export interface ForgotPasswordPayloadInterface {
  email: string;
}

export interface ResetPasswordPayloadInterface {
  token: string;
  password: string;
}

export interface VerifyEmailPayloadInterface {
  token: string;
}

export interface SendVerificationEmailPayloadInterface {
  email: string;
}

export interface VerifyLogin2FAPayloadInterface {
  challengeId: string;
  code: string;
}

export interface ResendLogin2FAPayloadInterface {
  challengeId: string;
}

export interface TwoFactorInitPayloadInterface {
  method: TwoFactorMethodEnum;
}

export interface TwoFactorFinishPayloadInterface {
  method: TwoFactorMethodEnum;
  code: string;
}

/* -------------------------------------------------------------------------- */
/* Results — discriminated unions so callers cannot read a field that does not */
/* exist on the branch they got back.                                          */
/* -------------------------------------------------------------------------- */

export interface AccountBundle {
  auth: IAuth;
  user: IUser;
}

export type LoginResultInterface =
  | ({ requires2FA: true; challengeId: string; method: TwoFactorMethodEnum } & AccountBundle)
  | ({ requires2FA: false; tokens: Access } & AccountBundle);

export type TwoFactorInitResult =
  | {
      method: TwoFactorMethodEnum.AUTHENTICATOR;
      qrDataURL: string;
      secret: string;
      message: string;
    }
  | { method: TwoFactorMethodEnum.EMAIL; message: string };

export interface SessionResultInterface extends AccountBundle {
  tokens: Access;
}

export interface MessageResultInterface {
  message: string;
}

/** Standard pagination envelope for every list endpoint. */
export interface QueryResult<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/* -------------------------------------------------------------------------- */
/* Store contract                                                             */
/* -------------------------------------------------------------------------- */

export interface authStore {
  access?: TokenPayload;
  refresh?: TokenPayload;
  auth: IAuth | null;
  user: IUser | null;
  hydrated: boolean;
}

export interface IAuthStore extends authStore {
  initUserStore: (payload: { auth: IAuth; user: IUser; tokens: Access }) => void;
  setAccess: (tokens: Access) => void;
  setAccount: (payload: { auth?: IAuth; user?: IUser }) => void;
  setHydrated: () => void;
  logoutAccount: () => void;
}
