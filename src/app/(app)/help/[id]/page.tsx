"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { Send } from "lucide-react";

import { ScreenHeader } from "@/components/general/app/screen-header";
import { StickyActionBar } from "@/components/general/app/sticky-action-bar";
import { SafetyCallout } from "@/components/general/safety-callout";
import { MessageBubble } from "@/components/general/ticket/message-bubble";
import { TicketStatusChip } from "@/components/general/ticket/ticket-status-chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toErrorMessage } from "@/helpers/errors";
import { relativeFromNow } from "@/helpers/timezones";
import { useCustomToast } from "@/hooks/useCustomToast";
import { useDeviceTimeZone } from "@/hooks/useDeviceTimeZone";
import { useMyTicket, useReopenTicket, useReplyToTicket } from "@/services/tickets.services";

const TERMINAL_STATUSES = new Set(["RESOLVED", "CLOSED"]);
const REOPEN_REASON_MIN = 3;

/**
 * A single ticket: the customer-visible thread, a reply composer, and — only once the ticket is
 * `RESOLVED` or `CLOSED` and still inside its reopen window — a reopen action.
 *
 * There is nothing here for internal notes, an assignee, or SLA timers: this is the customer's own
 * detail response, `GET /tickets/:id`, whose body only ever has `{ ticket, messages }` (D2). There is no
 * staff-shaped data to accidentally render because none is ever sent to this surface.
 */
export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const timezone = useDeviceTimeZone();
  const { showToast } = useCustomToast();

  const { data, isLoading, isError, error, refetch } = useMyTicket(params.id);
  const reply = useReplyToTicket();
  const reopen = useReopenTicket();

  const [draft, setDraft] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [reopenOpen, setReopenOpen] = useState(false);

  const ticket = data?.ticket;
  const isTerminal = ticket ? TERMINAL_STATUSES.has(ticket.status) : false;
  const canReopen =
    isTerminal &&
    Boolean(ticket?.reopenableUntil) &&
    DateTime.fromISO(ticket!.reopenableUntil!) > DateTime.now();

  function handleSend() {
    if (!draft.trim() || reply.isPending) return;

    reply.mutate(
      { ticketId: params.id, body: draft.trim() },
      {
        onSuccess: () => setDraft(""),
        onError: (err) =>
          showToast({
            title: "Message not sent",
            description: toErrorMessage(err, "Try again."),
            type: "error",
          }),
      },
    );
  }

  function handleReopen() {
    if (reopenReason.trim().length < REOPEN_REASON_MIN || reopen.isPending) return;

    reopen.mutate(
      { ticketId: params.id, reason: reopenReason.trim() },
      {
        onSuccess: () => {
          showToast({ title: "Ticket reopened", type: "success" });
          setReopenOpen(false);
          setReopenReason("");
        },
        onError: (err) => {
          // A 409 here means the reopen window has already lapsed since the page loaded — a real,
          // if rare, race. Surfacing the API's own message rather than a generic one tells the
          // customer exactly why, instead of leaving them to retry a dead action.
          showToast({
            title: "Couldn't reopen this ticket",
            description: toErrorMessage(
              err,
              "That window may have closed. Start a new ticket instead.",
            ),
            type: "error",
          });
        },
      },
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title={ticket?.ticketNumber ?? "Ticket"} onBack={() => router.push("/help")} />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" className="text-kumtru-blue" />
        </div>
      ) : isError || !data ? (
        <div className="flex-1 px-4 pt-4">
          <SafetyCallout variant="risk" title="Couldn't load this ticket.">
            {toErrorMessage(error, "Something went wrong.")}{" "}
            <button
              type="button"
              onClick={() => void refetch()}
              className="font-semibold underline"
            >
              Try again
            </button>
          </SafetyCallout>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div>
              <div className="flex items-center gap-2">
                <TicketStatusChip status={ticket!.status} />
                <span className="text-[11px] text-kumtru-slate-400">
                  Opened {relativeFromNow(ticket!.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold">{ticket!.category}</p>
            </div>

            <div className="space-y-2.5">
              {data.messages.map((message) => (
                <MessageBubble key={message.id} message={message} timezone={timezone} />
              ))}
            </div>

            {isTerminal ? (
              canReopen ? (
                <SafetyCallout variant="info" title="This ticket is closed.">
                  Still not sorted? You can reopen it — that&apos;s faster than starting over, and
                  keeps everything you already told us.
                  <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm" className="mt-2.5">
                        Reopen this ticket
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reopen this ticket</DialogTitle>
                        <DialogDescription>
                          Tell us what&apos;s still wrong — this goes straight back to a Komtru
                          agent.
                        </DialogDescription>
                      </DialogHeader>
                      <Textarea
                        placeholder="What's still not resolved?"
                        value={reopenReason}
                        onChange={(event) => setReopenReason(event.target.value)}
                        rows={4}
                      />
                      <DialogFooter>
                        <Button
                          disabled={
                            reopenReason.trim().length < REOPEN_REASON_MIN || reopen.isPending
                          }
                          onClick={handleReopen}
                        >
                          {reopen.isPending ? <Spinner /> : "Reopen"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </SafetyCallout>
              ) : (
                <SafetyCallout variant="info" title="This ticket is closed.">
                  It&apos;s past the window to reopen it. If this is still going on, start a new
                  ticket and mention this one&apos;s number — {ticket!.ticketNumber}.
                </SafetyCallout>
              )
            ) : null}
          </div>

          {!isTerminal ? (
            <StickyActionBar>
              <div className="flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Reply to Komtru support…"
                  rows={1}
                  className="max-h-32 min-h-11 flex-1 resize-none"
                />
                <Button
                  size="icon-lg"
                  disabled={!draft.trim() || reply.isPending}
                  onClick={handleSend}
                  aria-label="Send reply"
                >
                  {reply.isPending ? <Spinner /> : <Send className="size-4" aria-hidden="true" />}
                </Button>
              </div>
            </StickyActionBar>
          ) : null}
        </>
      )}
    </div>
  );
}
