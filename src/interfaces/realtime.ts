import type { Socket } from "socket.io-client";

import type { ITrade, TradeStatusEnum } from "@/interfaces/trade";

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Events the backend pushes to a user's personal room.
 *
 * Feature-specific rooms (dispute mediation, trade chat) declare their own
 * event names next to the feature — this list is only the plumbing layer's
 * concern: what every authenticated session receives without extra wiring.
 */
export const REALTIME_EVENTS = {
  NOTIFICATION: "notification",
  /**
   * A trade one of this user's sessions is party to changed state.
   *
   * Must match `TRADE_UPDATED_EVENT` in the backend's `modules/trades/services/realtime.service.ts`
   * exactly. It arrives on the personal room, so no `room:join` is needed — the server pushes to every
   * participant of the trade and to nobody else.
   */
  TRADE_UPDATED: "trade.updated",
} as const;

/* -------------------------------------------------------------------------- */
/* Payloads                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Intentionally loose. A live event means "something changed, go check" — the
 * canonical shape of a notification belongs to the Notifications module, which
 * reads it back from the API rather than trusting the socket frame.
 */
export interface NotificationPayload {
  id?: string;
  type?: string;
  title?: string;
  body?: string;
  createdAt?: string;
  data?: Record<string, unknown>;
}

/**
 * A trade transition, with the trade attached.
 *
 * The exception to the "a live event means go check" rule above, and deliberately: `trade` is the SAME
 * body `GET /trades/:tradeCode` returns, produced by the same serializer on the server, so it can go
 * straight into the query cache instead of triggering a refetch of something we were just handed.
 *
 * `trade` is still optional. If the server ever slims the frame down to the event and the code, the
 * handler falls back to invalidating — which is the same outcome, one round-trip slower.
 */
export interface TradeUpdatedPayload {
  /** The backend bus event's id. Stable across a replay, so a duplicated frame is detectable. */
  eventId: string;
  /** Which transition — `trade.funded`, `trade.shipped`, … — for a client that wants to say so. */
  eventType: string;
  occurredAt: string;
  tradeCode: string;
  status: TradeStatusEnum;
  trade?: ITrade;
}

/** One delivery, as buffered in memory for the current tab. */
export interface LiveNotification {
  /** The backend's id when it sends one, so a replayed frame does not duplicate. */
  id: string;
  receivedAt: number;
  payload: NotificationPayload;
}

/* -------------------------------------------------------------------------- */
/* Context contracts                                                          */
/* -------------------------------------------------------------------------- */

export interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

export interface NotificationContextValue {
  /** Newest first, capped — the full history lives behind `GET /notifications`. */
  notifications: LiveNotification[];
  unreadCount: number;
  markAllRead: () => void;
  clear: () => void;
}
