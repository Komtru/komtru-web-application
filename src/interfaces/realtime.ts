import type { Socket } from "socket.io-client";

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
