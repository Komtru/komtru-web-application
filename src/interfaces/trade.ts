import type { QueryResult } from "@/interfaces/IAxios";

/* -------------------------------------------------------------------------- */
/* Enums — the trade lifecycle is a state machine; these are its states.       */
/* -------------------------------------------------------------------------- */

export enum TradeStatusEnum {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  AGREED = "AGREED",
  PROTECTED = "PROTECTED",
  IN_PROGRESS = "IN_PROGRESS",
  FULFILLED = "FULFILLED",
  COMPLETED = "COMPLETED",
  SETTLED = "SETTLED",
  CANCELLED = "CANCELLED",
  DISPUTED = "DISPUTED",
  EXPIRED = "EXPIRED",
  REFUNDED = "REFUNDED",
}

export enum TradeRoleEnum {
  BUYER = "buyer",
  SELLER = "seller",
}

export enum TradeSubjectTypeEnum {
  PHYSICAL_GOOD = "physical_good",
  DIGITAL_GOOD = "digital_good",
  SERVICE = "service",
  RENTAL = "rental",
}

export enum PaymentStatusEnum {
  NOT_REQUIRED = "NOT_REQUIRED",
  PENDING = "PENDING",
  PROTECTED = "PROTECTED",
  RELEASED = "RELEASED",
  REFUNDED = "REFUNDED",
}

export enum ProtectionStatusEnum {
  NOT_PROTECTED = "not_protected",
  PROTECTED = "protected",
  RELEASED = "released",
}

export enum ReleaseStatusEnum {
  PENDING = "pending",
  RELEASED = "released",
  WITHHELD = "withheld",
}

export enum FulfilmentStatusEnum {
  NOT_STARTED = "not_started",
  AWAITING_SHIPMENT = "awaiting_shipment",
  DISPATCHED = "dispatched",
  DELIVERED = "delivered",
  FAILED = "failed",
}

export enum AcceptanceStatusEnum {
  INVITED = "invited",
  ACCEPTED = "accepted",
  DECLINED = "declined",
}

export enum TrustEventImpactEnum {
  POSITIVE = "positive",
  NEUTRAL = "neutral",
  NEGATIVE = "negative",
}

/* -------------------------------------------------------------------------- */
/* Entities                                                                   */
/* -------------------------------------------------------------------------- */

export interface ITradeParticipant {
  userId: string;
  displayName?: string;
  role: TradeRoleEnum;
  joinedAt: string;
  /**
   * Whether this person is *on* the trade — not whether they have accepted its
   * terms. That is `ITradeAgreement.acceptedBy`, and confusing the two is a real
   * trap: the API writes `ACCEPTED` here for both the creator and the redeemer
   * the moment each joins, and no path ever writes `INVITED` or `DECLINED`. So
   * this is effectively a constant today, and reading it as agreement acceptance
   * reports every trade as agreed by both sides before anyone has agreed to
   * anything.
   */
  acceptanceStatus: AcceptanceStatusEnum;
}

export interface ITradeSubject {
  type: TradeSubjectTypeEnum;
  title: string;
  description?: string;
  quantity: number;
  condition?: string;
  category?: string;
}

export interface ITradeFinancials {
  /** Minor units (kobo). Never a float. */
  amount: number;
  currency: string;
  fees?: number;
  paymentStatus: PaymentStatusEnum;
  protectionStatus: ProtectionStatusEnum;
  releaseStatus: ReleaseStatusEnum;
}

export interface ITradeAgreement {
  agreementId: string;
  version: number;
  deliveryTerms: string;
  inspectionPeriod: string;
  cancellationTerms: string;
  disputeTerms: string;
  createdAt: string;
  acceptedBy: string[];
  acceptedAt?: string;
}

export interface ITradeFulfilment {
  status: FulfilmentStatusEnum;
  courier?: string;
  tracking?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
}

export interface ITradeEvidence {
  evidenceId: string;
  kind: "image" | "document" | "note";
  url?: string;
  note?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ITradeDispute {
  disputeId: string;
  raisedBy: string;
  reason: string;
  status: "open" | "under_review" | "resolved";
  openedAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface ITrustEvent {
  eventId: string;
  type: string;
  participantId: string;
  timestamp: string;
  impact: TrustEventImpactEnum;
}

export interface ITrade {
  tradeId: string;
  tradeCode: string;
  createdAt: string;
  updatedAt: string;
  status: TradeStatusEnum;
  version: number;
  initiatedBy: string;
  participants: ITradeParticipant[];
  subject: ITradeSubject;
  financials: ITradeFinancials;
  agreement: ITradeAgreement;
  fulfilment: ITradeFulfilment;
  evidence: ITradeEvidence[];
  dispute: ITradeDispute | null;
  trustEvents: ITrustEvent[];
}

/* -------------------------------------------------------------------------- */
/* Payloads                                                                   */
/* -------------------------------------------------------------------------- */

export interface CreateTradePayloadInterface {
  role: TradeRoleEnum;
  subject: Omit<ITradeSubject, "quantity"> & { quantity?: number };
  amount: number;
  currency?: string;
  deliveryTerms: string;
  inspectionPeriod?: string;
  cancellationTerms?: string;
}

export interface AcceptTradePayloadInterface {
  tradeCode: string;
}

export interface FundTradePayloadInterface {
  tradeCode: string;
}

export interface ShipTradePayloadInterface {
  tradeCode: string;
  courier: string;
  tracking?: string;
}

export interface ConfirmDeliveryPayloadInterface {
  tradeCode: string;
}

export interface RaiseDisputePayloadInterface {
  tradeCode: string;
  reason: string;
}

export interface ListTradesQueryInterface {
  status?: TradeStatusEnum;
  role?: TradeRoleEnum;
  page?: number;
  limit?: number;
}

export type TradeListResult = QueryResult<ITrade>;

/* -------------------------------------------------------------------------- */
/* Trust profile                                                              */
/* -------------------------------------------------------------------------- */

export interface ITrustProfile {
  userId: string;
  displayName: string;
  tradesCompleted: number;
  tradesDisputed: number;
  disputesLost: number;
  onTimeRate: number;
  memberSince: string;
  verifiedIdentity: boolean;
  verifiedBusiness: boolean;
}
