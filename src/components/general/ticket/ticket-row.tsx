import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { TicketStatusChip } from "@/components/general/ticket/ticket-status-chip";
import { relativeFromNow } from "@/helpers/timezones";
import type { Ticket } from "@/interfaces/tickets";

/**
 * The list unit on the Help & Support screen — `TradeRow`'s sibling.
 *
 * Deliberately does not surface priority or the SLA due-date fields: both are triage vocabulary for the
 * staff console (`operations-app`'s ticket queue), not something a customer benefits from seeing about
 * their own ticket. What they need is what it is about, where it stands, and when they last heard.
 */
export function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <Link
      href={`/help/${ticket.id}`}
      className="block rounded-kumtru-md border border-border bg-card p-3.5 transition-colors active:bg-secondary"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="line-clamp-1 text-sm font-semibold">{ticket.category}</span>
        <TicketStatusChip status={ticket.status} className="shrink-0" />
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-kumtru-slate-400">
        <MessageCircle className="size-3" aria-hidden="true" />
        <span className="font-mono">{ticket.ticketNumber}</span>
        <span aria-hidden="true">·</span>
        <span>Opened {relativeFromNow(ticket.createdAt)}</span>
      </div>
    </Link>
  );
}
