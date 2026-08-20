import { TradeStatusEnum } from "@/interfaces/trade";

export type TrustTone =
  | "unverified"
  | "verifying"
  | "verified"
  | "protected"
  | "awaiting"
  | "risk"
  | "resolved"
  | "archived";

export interface StatusPresentation {
  label: string;
  tone: TrustTone;
}

/**
 * Raw lifecycle states are engineering vocabulary. Users see trust language:
 * "Protected", "Awaiting action", "At risk". This is the only mapping.
 */
const STATUS_PRESENTATION: Record<TradeStatusEnum, StatusPresentation> = {
  [TradeStatusEnum.DRAFT]: { label: "Draft", tone: "archived" },
  [TradeStatusEnum.OPEN]: { label: "Awaiting action", tone: "awaiting" },
  [TradeStatusEnum.AGREED]: { label: "Awaiting action", tone: "awaiting" },
  [TradeStatusEnum.PROTECTED]: { label: "Protected", tone: "protected" },
  [TradeStatusEnum.IN_PROGRESS]: { label: "Protected", tone: "protected" },
  [TradeStatusEnum.FULFILLED]: { label: "Awaiting action", tone: "awaiting" },
  [TradeStatusEnum.COMPLETED]: { label: "Resolved", tone: "resolved" },
  [TradeStatusEnum.SETTLED]: { label: "Resolved", tone: "resolved" },
  [TradeStatusEnum.CANCELLED]: { label: "Archived", tone: "archived" },
  [TradeStatusEnum.DISPUTED]: { label: "At risk", tone: "risk" },
  [TradeStatusEnum.EXPIRED]: { label: "Archived", tone: "archived" },
  [TradeStatusEnum.REFUNDED]: { label: "Resolved", tone: "resolved" },
};

export function presentStatus(status: TradeStatusEnum): StatusPresentation {
  return STATUS_PRESENTATION[status] ?? { label: "Unverified", tone: "unverified" };
}

/** Ordered spine of the happy path, for progress rendering. */
export const TRADE_PROGRESSION: readonly TradeStatusEnum[] = [
  TradeStatusEnum.DRAFT,
  TradeStatusEnum.OPEN,
  TradeStatusEnum.AGREED,
  TradeStatusEnum.PROTECTED,
  TradeStatusEnum.IN_PROGRESS,
  TradeStatusEnum.FULFILLED,
  TradeStatusEnum.COMPLETED,
  TradeStatusEnum.SETTLED,
];

export const TRADE_TIMELINE: readonly { status: TradeStatusEnum; label: string }[] = [
  { status: TradeStatusEnum.AGREED, label: "Agreement confirmed" },
  { status: TradeStatusEnum.PROTECTED, label: "Funds protected" },
  { status: TradeStatusEnum.IN_PROGRESS, label: "Seller fulfilling" },
  { status: TradeStatusEnum.FULFILLED, label: "Delivered — inspection window" },
  { status: TradeStatusEnum.COMPLETED, label: "Payment released" },
];

export function progressionIndex(status: TradeStatusEnum): number {
  return TRADE_PROGRESSION.indexOf(status);
}
