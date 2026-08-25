/**
 * M10 (Tickets / Customer Support) — the customer's own conversation, `/tickets`.
 *
 * Mirrors `backend-apis/src/modules/tickets/http/controllers.ts`'s `serializeTicket` /
 * `serializeMessage` field-for-field. There is no `internalNotes` array here at all — the customer
 * endpoints never return one (D2: `GET /tickets/:id` returns only `messages`, the customer-visible
 * thread; staff-only internal notes are a different response shape on a different, STAFF-scoped route
 * this app never calls). That is enforced by this file simply not declaring the field, not by a runtime
 * filter — there is nothing here to leak.
 */

export type TicketStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "WAITING_INTERNAL"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type TicketChannel = "IN_APP" | "EMAIL" | "WHATSAPP" | "SYSTEM_AUTO";

export type MessageSenderType = "CUSTOMER" | "AGENT" | "SYSTEM";

export interface Ticket {
  id: string;
  ticketNumber: string;
  userId: string;
  queueCode: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  channel: TicketChannel;
  assignedAgentId: string | null;
  relatedTradeId: string | null;
  relatedPaymentId: string | null;
  relatedShipmentId: string | null;
  relatedDisputeId: string | null;
  sourceEvent: string | null;
  createdAt: string;
  firstResponseDueAt: string;
  resolutionDueAt: string;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  reopenCount: number;
  reopenableUntil: string | null;
}

export interface TicketMessage {
  id: string;
  senderType: MessageSenderType;
  senderId: string | null;
  visibility: "CUSTOMER_VISIBLE";
  body: string;
  attachmentRefs: string[];
  createdAt: string;
}

/** `GET /tickets/:id`'s shape — `messages` is always the customer-visible thread, nothing else. */
export interface TicketDetail {
  ticket: Ticket;
  messages: TicketMessage[];
}

/**
 * The topics a customer can pick from when opening a ticket, mapped to the backend's queue codes.
 *
 * Not every queue is here: `FRAUD` only ever opens from a system event (a detected session-reuse, say —
 * see `backend-apis`'s `tickets/bootstrap.ts`) and `COMPLIANCE` only ever opens from a staff escalation.
 * Neither is a thing a customer would self-select as "what this is about", so offering them here would
 * be six queues' worth of real choice plus two that exist purely to confuse. There is no
 * `GET /queues`-for-customers endpoint to read this list from at runtime — `/admin/ticket-queues` is
 * STAFF-scoped — so this is a deliberate, small, hand-kept mirror of the six customer-relevant rows in
 * the backend's `QUEUE_SEEDS`. If a queue's name or targets change there, this list is the one place on
 * the client that needs a matching edit.
 */
export const SUPPORT_TOPICS: { queueCode: string; label: string }[] = [
  { queueCode: "PAYMENTS", label: "A payment or refund" },
  { queueCode: "LOGISTICS", label: "Shipping or delivery" },
  { queueCode: "KYC", label: "Verifying my identity" },
  { queueCode: "MERCHANT_SUPPORT", label: "Selling on Komtru" },
  { queueCode: "TECHNICAL", label: "Something not working" },
  { queueCode: "GENERAL_SUPPORT", label: "Something else" },
];

export interface NewTicketPayload {
  queueCode: string;
  category: string;
  body: string;
}

export interface ReplyPayload {
  ticketId: string;
  body: string;
}

export interface ReopenPayload {
  ticketId: string;
  reason: string;
}
