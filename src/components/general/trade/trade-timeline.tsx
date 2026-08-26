import { humanizeToken } from "@/helpers/strings";
import { TRADE_TIMELINE, progressionIndex } from "@/helpers/tradeStatus";
import { formatInZone, relativeFromNow } from "@/helpers/timezones";
import {
  TradeStatusEnum,
  TrustEventImpactEnum,
  type ITradeFulfilment,
  type ITrustEvent,
} from "@/interfaces/trade";
import { cn } from "@/lib/utils";

const TRUST_IMPACT_DOT: Record<TrustEventImpactEnum, string> = {
  [TrustEventImpactEnum.POSITIVE]: "bg-kumtru-success",
  [TrustEventImpactEnum.NEUTRAL]: "bg-kumtru-slate-400",
  [TrustEventImpactEnum.NEGATIVE]: "bg-kumtru-risk",
};

export function TradeTimeline({
  status,
  fulfilment,
  trustEvents,
}: {
  status: TradeStatusEnum;
  fulfilment?: ITradeFulfilment;
  /**
   * Rendered chronologically underneath the state spine. `ITrade` carries no
   * per-status timestamp (only `createdAt`/`updatedAt` on the trade as a
   * whole), so a trust event cannot be pinned to the exact step it happened
   * during — it is woven into the same timeline card, ordered against every
   * other trust signal, rather than plotted against a status step it cannot
   * be proven to align with.
   */
  trustEvents?: ITrustEvent[];
}) {
  const currentIndex = progressionIndex(status);
  const isSettled = status === TradeStatusEnum.SETTLED;
  const orderedTrustEvents = [...(trustEvents ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div className="rounded-kumtru-md border border-border p-4">
      <ol>
        {TRADE_TIMELINE.map((step, index) => {
          const stepIndex = progressionIndex(step.status);
          const isDone = isSettled || currentIndex > stepIndex;
          const isCurrent = status === step.status;
          const isLast = index === TRADE_TIMELINE.length - 1;

          return (
            <li key={step.status} className={cn("relative flex gap-3", !isLast && "pb-5")}>
              <span
                aria-hidden="true"
                className={cn(
                  "z-1 mt-0.5 size-4 shrink-0 rounded-full",
                  isDone && "bg-kumtru-cyan",
                  isCurrent && "bg-kumtru-blue ring-3 ring-kumtru-blue-soft",
                  !isDone && !isCurrent && "bg-kumtru-slate-300",
                )}
              />

              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="absolute top-5 bottom-0 left-[7px] w-0.5 bg-border"
                />
              ) : null}

              <div className={cn("min-w-0", !isDone && !isCurrent && "opacity-50")}>
                <p className="text-[13px] font-semibold">{step.label}</p>
                {isCurrent ? (
                  <p className="mt-0.5 text-[11px] text-kumtru-slate-500">Current state</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {fulfilment?.tracking ? (
        <p className="mt-2 border-t border-border pt-3 text-[11px] text-kumtru-slate-500">
          {fulfilment.courier} · <span className="font-mono">{fulfilment.tracking}</span>
          {fulfilment.dispatchedAt
            ? ` · dispatched ${formatInZone(fulfilment.dispatchedAt)}`
            : null}
        </p>
      ) : null}

      {orderedTrustEvents.length > 0 ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-kumtru-slate-500 uppercase">
            Trust signals
          </p>
          <ul className="space-y-1.5">
            {orderedTrustEvents.map((event) => (
              <li key={event.eventId} className="flex items-start gap-2 text-[11px]">
                <span
                  aria-hidden="true"
                  className={cn("mt-1 size-1.5 shrink-0 rounded-full", TRUST_IMPACT_DOT[event.impact])}
                />
                <span className="text-kumtru-slate-600">
                  {humanizeToken(event.type)}
                  <span className="text-kumtru-slate-400"> · {relativeFromNow(event.timestamp)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
