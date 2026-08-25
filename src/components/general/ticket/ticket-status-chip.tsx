import { presentTicketStatus } from "@/helpers/ticketStatus";
import type { TrustTone } from "@/helpers/tradeStatus";
import type { TicketStatus } from "@/interfaces/tickets";
import { cn } from "@/lib/utils";

/** Same tone → class table as `TrustStatusChip`, kept local rather than imported: the trade chip's
 * table is a private detail of that component, not a shared export, and duplicating eight lines here
 * is cheaper than making it one. */
const toneClasses: Record<TrustTone, string> = {
  unverified: "bg-kumtru-neutral-soft text-kumtru-neutral-on-soft",
  verifying: "bg-kumtru-info-soft text-kumtru-info-on-soft",
  verified: "bg-kumtru-success-soft text-kumtru-success-on-soft",
  protected: "bg-kumtru-success-soft text-kumtru-success-on-soft",
  awaiting: "bg-kumtru-warning-soft text-kumtru-warning-on-soft",
  risk: "bg-kumtru-risk-soft text-kumtru-risk-on-soft",
  resolved: "bg-kumtru-success-soft text-kumtru-success-on-soft",
  archived: "bg-kumtru-slate-200 text-kumtru-slate-600",
};

export function TicketStatusChip({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  const { label, tone } = presentTicketStatus(status);

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      <i aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
