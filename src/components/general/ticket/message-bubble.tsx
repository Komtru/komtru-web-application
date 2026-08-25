import { formatInZone } from "@/helpers/timezones";
import type { TicketMessage } from "@/interfaces/tickets";
import { cn } from "@/lib/utils";

/**
 * One message in a ticket thread.
 *
 * `CUSTOMER` messages — this user's own — sit right and dark; `AGENT` and `SYSTEM` sit left and neutral.
 * `SYSTEM` gets no separate visual track: from the customer's side "an agent replied" and "the system
 * logged that the ticket was reopened" are both just a line from Komtru, and a third bubble style for a
 * distinction only staff care about would be one more thing to explain.
 */
export function MessageBubble({
  message,
  timezone,
}: {
  message: TicketMessage;
  timezone?: string;
}) {
  const fromCustomer = message.senderType === "CUSTOMER";

  return (
    <div className={cn("flex", fromCustomer ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-kumtru-md px-3.5 py-2.5",
          fromCustomer ? "bg-kumtru-blue text-white" : "bg-secondary text-foreground",
        )}
      >
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.body}</p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            fromCustomer ? "text-white/70" : "text-kumtru-slate-400",
          )}
        >
          {message.senderType === "AGENT" ? "Komtru support · " : null}
          {formatInZone(message.createdAt, timezone)}
        </p>
      </div>
    </div>
  );
}
