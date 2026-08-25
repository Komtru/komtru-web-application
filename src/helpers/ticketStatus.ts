import type { TrustTone } from "@/helpers/tradeStatus";
import type { TicketStatus } from "@/interfaces/tickets";

export interface TicketStatusPresentation {
  label: string;
  tone: TrustTone;
}

/**
 * Raw ticket states are engineering vocabulary, same reasoning as `tradeStatus.ts`'s
 * `STATUS_PRESENTATION`: a customer reads "Waiting on you" or "Resolved", never `WAITING_CUSTOMER` or
 * `RESOLVED`. Reuses `TrustTone` rather than inventing a parallel palette — trade and ticket chips
 * should read as the same visual language, not two different ones that happen to share colours.
 *
 * `WAITING_INTERNAL` is the one status a customer can be looking at without having caused it — it means
 * this ticket has been escalated to Disputes (M3) behind the scenes. It is presented as "Under review",
 * not as anything mentioning disputes or escalation: that handoff is staff-facing machinery the customer
 * has no action to take on, and no vocabulary for yet.
 */
const TICKET_STATUS_PRESENTATION: Record<TicketStatus, TicketStatusPresentation> = {
  OPEN: { label: "Submitted", tone: "verifying" },
  ASSIGNED: { label: "Being reviewed", tone: "verifying" },
  IN_PROGRESS: { label: "In progress", tone: "verifying" },
  WAITING_CUSTOMER: { label: "Waiting on you", tone: "awaiting" },
  WAITING_INTERNAL: { label: "Under review", tone: "verifying" },
  RESOLVED: { label: "Resolved", tone: "resolved" },
  CLOSED: { label: "Closed", tone: "archived" },
  REOPENED: { label: "Reopened", tone: "verifying" },
};

export function presentTicketStatus(status: TicketStatus): TicketStatusPresentation {
  return TICKET_STATUS_PRESENTATION[status] ?? { label: "Unknown", tone: "archived" };
}
